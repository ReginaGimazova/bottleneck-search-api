import { promisify } from 'util';
import { MysqlError } from 'mysql';

import {logger} from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import DBConnection from '../DatabaseAccess/DBConnection';
import StatusesConfigurationDataStore from '../StatusesConfiguration/StatusesConfigurationDataStore';
import { rejectedQueryDataStore } from '../RejectedQueriesSaving/RejectedQueryDataStore';
import FilteredQueryDataStore from "../FilteredQueries/FilteredQueryDataStore";
import QueriesDataStoreBase from "../QueriesDataStoreBase";

class ExplainQueriesDataStore extends QueriesDataStoreBase {
  /**
   *
   * @param queries - filtered queries
   *
   * method used for create
   *    (id = filtered_query_id, query_text = filtered_query_text, result = explain info )
   * tuples from queries.
   */

  protected convertQueriesToTuple(queries) {
    return queries.map(({ id, query_text }) => ({
      id,
      query_text,
      result: undefined,
    }));
  }

  /**
   *
   * @param tuples, created in convertQueriesToTuple method (result = EXPLAIN output),
   * convert to query string, suitable for MySQL insert statement
   */
  protected prepareInsertValues = tuples =>
    tuples
      .filter(tuple => tuple.result)
      .map(({id, result}) => [`${id}`, `${result}`])

  /**
   *
   * @param tuples - tuples, created in convertQueriesToTuple method (result = undefined)
   * @param prodConnection - connection to production database, which contains original info
   * @param connection - connection to tool database
   * @param callback - return updated tuples with result = EXPLAIN output
   */
  private analyzeQueries({ tuples, prodConnection, connection, callback }) {
    const promisifyQuery = promisify(prodConnection.query).bind(prodConnection);

    tuples.forEach(async ({ query_text }, index) => {
      const queryString = `explain ${query_text};`;

      try {
        const analyzeResult = await promisifyQuery(queryString);
        tuples[index].result = JSON.stringify(analyzeResult[0]);

        if (index === tuples.length - 1) {
          return callback(tuples);
        }
      } catch (e) {
        rejectedQueryDataStore.save({
          connection,
          type: 'EXPLAIN',
          rejectedQuery: query_text,
          errorText: e.message,
        });
        logger.logError(e.message);
      }
    });
  }

  /**
   *
   * @param connection - connection to tool database
   * @param prodConnection - connection to production database, which contains original info
   * @param isUpdate - if run only EXPLAIN update, not all file analyze, updateProgress shouldn't be called
   * @param queries - filtered queries
   * @param callback - return 'true' to FilteredQueryDataStore, if all queries with EXPLAIN info were inserted
   */
  public save({ connection, prodConnection, isUpdate = false, queries, callback }) {
    const tuples = this.convertQueriesToTuple(queries);
    const promisifyQuery = promisify(connection.query).bind(connection);

    this.analyzeQueries({
      tuples,
      prodConnection,
      connection,
      callback: async updatedTuples => {
        const values = this.prepareInsertValues(updatedTuples);
        const queryString = `
          insert into master.explain_replay_info
          (query_id, explain_result) values ?`;

        try {
          await promisifyQuery(queryString, [values]);
          if (!isUpdate) {
            await analyzeProgress.updateProgress();
          }
          logger.logInfo('EXPLAIN result saved')
          return callback(true)
        } catch (insertError) {
          if (!isUpdate) {
            await analyzeProgress.resetCounter();
          }
          logger.logError(insertError.message);
          connection.rollback();
        }
      },
    });
  }

  public async updateExplainResult(explainResultCallback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const prodConnection = dbConnection.createProdConnection();

    const filteredQueryDataStore = new FilteredQueryDataStore();

    try {
      const queries = await filteredQueryDataStore.getAllFilteredQueries(connection);
      this.save({connection, prodConnection, queries, isUpdate: true, callback: (inserted => {
        if (inserted){
          connection.commit();
          connection.end();
          prodConnection.end();

          return explainResultCallback(
            {status: inserted},
            inserted ? undefined : new Error('There was an error in analyze queries by EXPLAIN'));
        }
      })});
    } catch (error) {
      await analyzeProgress.resetCounter();
      logger.logError(error.message);
      connection.end();
      prodConnection.end();
    }
  }

  protected tablesQueryBuild(tables): string {
    return super.tablesQueryBuild(tables);
  }

  /**
   *
   * @param tables - a set of tables for find matching queries
   * @param callback - returns the retrieving rows by search tables and EXPLAIN statuses configuration
   */
  public async getExplainInfo(tables, callback) {
    const connection = new DBConnection().createToolConnection();

    const statusesConfigurationDataStore = new StatusesConfigurationDataStore();
    let count = 0;

    await statusesConfigurationDataStore.checkStatusesConfigExist({
      connection,
      type: 'explain',
      callbackCountOfStatuses: currentCount => {
        count = currentCount;
      },
    });

    const tablesJoinPart =  this.tablesQueryBuild(tables);

    const withStatuses = `
      select explain_info as critical_statuses, master.parametrized_queries.parsed_query, queries_to_user_host.query_count
      from (
        select
          query_id,
          json_unquote(json_extract(explain_result, '$.Extra')) explain_info
        from master.explain_replay_info)
        as replay_info
      inner join master.statuses_configuration
        on json_search(json_array(explain_info), 'one', statuses_configuration.value) is not null
      inner join master.filtered_queries on query_id = filtered_queries.id
      inner join master.parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
      inner join (
        select
          parametrized_query_id,
          sum(query_count) as query_count
        from master.queries_to_user_host
        group by parametrized_query_id) as queries_to_user_host
        on parametrized_queries.id = queries_to_user_host.parametrized_query_id
      ${tables.length > 0 ? tablesJoinPart : ''}
      where mode = true and type = 'EXPLAIN'
      group by parametrized_queries.parsed_query_hash
      order by query_count desc;
    `;

    const withoutStatuses = `
      select explain_info as critical_statuses, master.parametrized_queries.parsed_query, queries_to_user_host.query_count
      from (
        select
          query_id,
          json_unquote(json_extract(explain_result, '$.Extra')) explain_info
        from master.explain_replay_info)
        as replay_info
        
        inner join master.filtered_queries on query_id = filtered_queries.id
        inner join master.parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
        inner join (
          select
            parametrized_query_id,
            sum(query_count) as query_count
          from master.queries_to_user_host
          group by parametrized_query_id) as queries_to_user_host
          on parametrized_queries.id = queries_to_user_host.parametrized_query_id
        ${tables.length > 0 ? tablesJoinPart : ''}
      group by parametrized_queries.parsed_query_hash
      order by query_count desc;
    `;

    const query = count > 0 ? withStatuses : withoutStatuses;

    connection.query(query, (err: MysqlError, result: any) => {
      if (result) {
        callback(result, undefined);
      }
      if (err) {
        logger.logError(err);
        callback(undefined, err);
      }
    });

    connection.end();
  }
}

export default ExplainQueriesDataStore;
