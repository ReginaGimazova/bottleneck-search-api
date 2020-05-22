import { promisify } from 'util';
import { MysqlError } from 'mysql';

import Logger from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import DBConnection from '../DatabaseAccess/DBConnection';
import StatusesConfigurationDataStore from '../StatusesConfiguration/StatusesConfigurationDataStore';

class ExplainQueriesDataStore {
  /**
   *
   * @param queries
   */
  protected convertQueriesToTuple(queries) {
    return queries.map(({ id, query_text }) => {
      return {
        id,
        query_text,
        result: undefined,
      };
    });
  }

  /**
   *
   * @param tuples
   */
  protected prepareInsertValues = tuples =>
    tuples.map(({ id, result }) => [`${id}`, `${result}`]);

  /**
   *
   * @param tuples
   * @param prodConnection
   * @param callback
   */
  private analyzeQueries({ tuples, prodConnection, callback }) {
    const logger = new Logger();

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
        prodConnection.rollback();
        logger.logError(e.message);
      }
    });
  }

  /**
   *
   * @param connection
   * @param queries
   * @param prodConnection
   * @param callback
   */
  public save({ connection, queries, prodConnection, callback }) {
    const logger = new Logger();
    const tuples = this.convertQueriesToTuple(queries);

    const promisifyQuery = promisify(connection.query).bind(connection);

    this.analyzeQueries({
      tuples,
      prodConnection,
      callback: updatedTuples => {
        const values = this.prepareInsertValues(updatedTuples);
        const queryString = `insert into master.explain_replay_info
          (query_id, explain_result) values ?`;

        promisifyQuery(queryString, [values])
          .then(() => {
            analyzeProgress.explainResultInserted();
            callback(true);
          })
          .catch(insertError => {
            logger.logError(insertError.message);
            connection.rollback();
          });
      },
    });
  }

  /**
   *
   * @param tables
   * @param callback
   */
  public async getExplainInfo(tables, callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const logger = new Logger();
    const statusesConfigurationDataStore = new StatusesConfigurationDataStore();
    let count = 0;

    await statusesConfigurationDataStore.checkStatusesConfigExist({
      connection,
      logger,
      callbackCountOfStatuses: currentCount => {
        count = currentCount;
      },
    });

    console.log(count);

    const searchTables =
      tables.length > 0 ? tables.map(table => `"${table}"`).join(', ') : '';

    const queriesWithStatusesQuery = `
      select explain_info as critical_statuses, parametrized_queries.query_count, parametrized_queries.parsed_query
      from (
        select
          query_id,
          json_unquote(json_extract(explain_result, '$.Extra')) explain_info
        from explain_replay_info)
        as replay_info
        inner join statuses_configuration on statuses_configuration.value = explain_info
        inner join filtered_queries on query_id = filtered_queries.id
        inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
      where status = true and type = 'EXPLAIN';
    `;

    const queryWithStatusesAndTablesQuery = `
      select explain_info as critical_statuses, parametrized_queries.query_count, parametrized_queries.parsed_query
      from (
        select
          query_id,
          json_unquote(json_extract(explain_result, '$.Extra')) explain_info
        from explain_replay_info)
        as replay_info
        inner join statuses_configuration on statuses_configuration.value = explain_info
        inner join filtered_queries on query_id = filtered_queries.id
        inner join queries_to_tables on filtered_queries.id = queries_to_tables.query_id
        inner join tables_statistic on queries_to_tables.table_id = tables_statistic.id and table_name in (${searchTables})
        inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
      where status = true and type = 'EXPLAIN';
    `;

    const queryWithoutStatuses = `
      select explain_info as critical_statuses, parametrized_queries.query_count, parametrized_queries.parsed_query
      from (
        select
          query_id,
          json_unquote(json_extract(explain_result, '$.Extra')) explain_info
        from explain_replay_info)
        as replay_info
      inner join filtered_queries on query_id = filtered_queries.id
      inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id;
    `;

    let query = queriesWithStatusesQuery;

    if (count === 0 && tables.length === 0){
      query = queryWithoutStatuses
    } else if (count > 0 && tables.length > 0){
      query = queryWithStatusesAndTablesQuery;
    }

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
