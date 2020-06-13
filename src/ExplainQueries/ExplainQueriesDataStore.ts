import { promisify } from 'util';
import { MysqlError } from 'mysql';

import {logger} from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import DBConnection from '../DatabaseAccess/DBConnection';
import StatusesConfigurationDataStore from '../StatusesConfiguration/StatusesConfigurationDataStore';
import { rejectedQueryDataStore } from '../RejectedQueriesSaving/RejectedQueryDataStore';
import FilteredQueryDataStore from "../FilteredQueries/FilteredQueryDataStore";

class ExplainQueriesDataStore {
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
          callback(tuples);
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
   * @param queries - filtered queries
   * @param callback - return 'true' to FilteredQueryDataStore, if all queries with EXPLAIN info were inserted
   */
  public save({ connection, prodConnection, queries, callback }) {
    const tuples = this.convertQueriesToTuple(queries);
    const promisifyQuery = promisify(connection.query).bind(connection);

    this.analyzeQueries({
      tuples,
      prodConnection,
      connection,
      callback: updatedTuples => {
        const values = this.prepareInsertValues(updatedTuples);
        const queryString = `
          insert into master.explain_replay_info
          (query_id, explain_result) values ?`;

        promisifyQuery(queryString, [values])
          .then(() => {
            analyzeProgress.explainResultInserted();
            callback(true);
          })
          .catch(insertError => {
            analyzeProgress.handleErrorOnLogAnalyze(
              'There was an error in analyzing the general log during the processing of the command EXPLAIN'
            );

            logger.logError(insertError.message);
            connection.rollback();
          });
      },
    });
  }

  public updateExplainResult(explainResultCallback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const prodConnection = dbConnection.createProdConnection();

    const filteredQueryDataStore = new FilteredQueryDataStore();
    filteredQueryDataStore
      .getAllFilteredQueries(connection)
      .then(queries => {
        this.save({connection, prodConnection, queries, callback: (inserted => {
          if (inserted){
            connection.commit();
            connection.end();
            prodConnection.end();
            explainResultCallback(
              {status: inserted},
              inserted ? undefined : new Error('There was an error in analyze queries by EXPLAIN'));
          }
        })});
      })
      .catch(error => {
        logger.logError(error.message);
        connection.end();
        prodConnection.end();
      })
  }
  /**
   *
   * @param tables - a set of tables for find matching queries
   * @param callback - returns the retrieving rows by search tables and EXPLAIN statuses configuration
   */
  public async getExplainInfo(tables, callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();

    const statusesConfigurationDataStore = new StatusesConfigurationDataStore();
    let count = 0;

    await statusesConfigurationDataStore.checkStatusesConfigExist({
      connection,
      type: 'explain',
      callbackCountOfStatuses: currentCount => {
        count = currentCount;
      },
    });

    const searchTables =
      tables.length > 0 ? tables.map(table => `"${table}"`).join(', ') : '';

    const tablesJoinPart = `
      inner join queries_to_tables on filtered_queries.id = queries_to_tables.query_id
      inner join tables_statistic
        on queries_to_tables.table_id = tables_statistic.id
        and json_search(json_array(${searchTables}), 'all', table_name) > 0
    `;

    const withStatuses = `
      select explain_info as critical_statuses, parametrized_queries.query_count, parametrized_queries.parsed_query
      from (
        select
          query_id,
          json_unquote(json_extract(explain_result, '$.Extra')) explain_info
        from explain_replay_info)
        as replay_info
      inner join statuses_configuration
        on json_search(json_array(explain_info), 'one', statuses_configuration.value) is not null
      inner join filtered_queries on query_id = filtered_queries.id
      inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
      ${tables.length > 0 ? tablesJoinPart : ''}
      where mode = true and type = 'EXPLAIN'
      group by parametrized_queries.parsed_query_hash;
    `;

    const withoutStatuses = `
      select explain_info as critical_statuses, parametrized_queries.query_count, parametrized_queries.parsed_query
      from (
         select
           query_id,
           json_unquote(json_extract(explain_result, '$.Extra')) explain_info
         from explain_replay_info)
         as replay_info
      inner join filtered_queries on query_id = filtered_queries.id
      inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
      ${tables.length > 0 ? tablesJoinPart : ''}
      group by parametrized_queries.parsed_query_hash;
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
