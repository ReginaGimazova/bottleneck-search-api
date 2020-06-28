import { promisify } from 'util';
import { MysqlError } from 'mysql';

import {logger} from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import DBConnection from '../DatabaseAccess/DBConnection';
import StatusesConfigurationDataStore from '../StatusesConfiguration/StatusesConfigurationDataStore';
import { rejectedQueryDataStore } from '../RejectedQueriesSaving/RejectedQueryDataStore';
import FilteredQueryDataStore from "../FilteredQueries/FilteredQueryDataStore";
import QueriesDataStoreBase from "../helpers/QueriesDataStoreBase";

class ExplainQueriesDataStore extends QueriesDataStoreBase {
  /**
   *
   * @param queries - filtered queries
   *
   * @summary Create (id = filtered_query_id, query_text = filtered_query_text, result = explain info ) tuples from queries.
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
   * @param filteredQueriesTuples - created in convertQueriesToTuple method (result = EXPLAIN output),
   * @summary Convert to query string, suitable for MySQL insert statement
   */
  protected prepareInsertValues = filteredQueriesTuples =>
    filteredQueriesTuples
      .filter(tuple => tuple.result)
      .map(({id, result}) => [`${id}`, `${result}`])

  /**
   *
   * @param filteredQueriesTuples - tuples, created in convertQueriesToTuple method (result = undefined)
   * @param prodConnection - connection to production database, which contains original info
   * @param connection - connection to tool database
   * @param callback - return updated tuples with result = EXPLAIN output
   *
   * @summary Execute 'EXPLAIN' command for all queries
   */
  private analyzeQueries({ filteredQueriesTuples, prodConnection, connection, callback }) {
    const promisifyQuery = promisify(prodConnection.query).bind(prodConnection);

    filteredQueriesTuples.forEach(async ({ query_text }, index) => {
      const queryString = `explain ${query_text};`;

      try {
        const analyzeResult = await promisifyQuery(queryString);
        filteredQueriesTuples[index].result = JSON.stringify(analyzeResult[0]);

        if (index === filteredQueriesTuples.length - 1) {
          return callback(filteredQueriesTuples);
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
   * @param isUpdate - this value = true, if the EXPLAIN result should be updated, this value = false, if the whole file analyze
   * @param queries - filtered queries
   * @param callback - return 'true' to FilteredQueryDataStore, if all queries with EXPLAIN info were inserted
   *
   * @summary Save 'EXPLAIN' result to explain_replay_info table
   */
  public save({ connection, prodConnection, isUpdate = false, queries, callback }) {
    const filteredQueriesTuples = this.convertQueriesToTuple(queries);
    const promisifyQuery = promisify(connection.query).bind(connection);

    this.analyzeQueries({
      filteredQueriesTuples,
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

  /**
   *
   * @param explainResultCallback - return Error or undefined
   *
   * @summary Execute 'EXPLAIN' command for all queries
   */
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

          return explainResultCallback(undefined);
        }
      })});
    } catch (error) {
      await analyzeProgress.resetCounter();
      logger.logError(error.message);
      connection.end();
      prodConnection.end();
      return explainResultCallback(new Error('There was an error in analyze queries by EXPLAIN'));
    }
  }

  /**
   *
   * @param tables - a set of tables
   *
   * @summary Return prepared part of query string with tables_statistic, queries_to_tables relationships join
   */
  protected tablesQueryBuild(tables): string {
    return super.tablesQueryBuild(tables);
  }

  /**
   *
   * @param tables - a set of tables for find matching queries
   * @param explainStatusesCallback - returns the retrieving rows by search tables and EXPLAIN statuses configuration
   *
   * @summary Select 'EXPLAIN' result for all queries
   */
  public async getExplainInfo(tables, explainStatusesCallback) {
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

    const tablesJoinPart = this.tablesQueryBuild(tables);

    const withStatuses = `
      select 
        json_arrayagg( 
          json_object (
            'status', explain_info,
            'statusId', replay_info.id
          )) as critical_statuses, 
        master.parametrized_queries.parsed_query, 
        queries_to_user_host.query_count
      from (
        select
          query_id,
          id,
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
      select 
         json_arrayagg( 
          json_object (
            'status', explain_info,
            'statusId', replay_info.id
          )) as critical_statuses, 
        master.parametrized_queries.parsed_query, 
        queries_to_user_host.query_count
      from (
        select
          id,
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
        explainStatusesCallback(result, undefined);
      }
      if (err) {
        logger.logError(err);
        explainStatusesCallback(undefined, err);
      }
    });

    connection.end();
  }
}

export default ExplainQueriesDataStore;
