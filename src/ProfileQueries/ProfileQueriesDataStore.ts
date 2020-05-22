import { promisify } from 'util';
import { MysqlError } from 'mysql';

import Logger from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import DBConnection from '../DatabaseAccess/DBConnection';
import StatusesConfigurationDataStore from '../StatusesConfiguration/StatusesConfigurationDataStore';

class ProfileQueriesDataStore {
  protected convertQueriesToTuple(queries) {
    return queries.map(({ id, query_text }) => {
      return {
        id,
        query_text,
        result: undefined,
      };
    });
  }

  protected prepareInsertValues = tuples =>
    tuples
      .map(({ id, result }) =>
        result
          .map(
            ({ Status, Duration }) => `('${id}', '${Status}', '${Duration}')`
          )
          .join(', ')
      )
      .join(', ');

  private analyzeQueries({ tuples, callback, prodConnection }) {
    const logger = new Logger();
    const promisifyQuery = promisify(prodConnection.query).bind(prodConnection);

    tuples.forEach(async ({ query_text }, index) => {
      try {
        await promisifyQuery(query_text);
      } catch (e) {
        prodConnection.rollback();
        logger.logError(e.message);
      }

      try {
        const analyzeResult = await promisifyQuery('show profile;');
        console.log(analyzeResult);

        tuples[index].result = analyzeResult;

        if (index === tuples.length - 1) {
          callback(tuples);
        }
      } catch (e) {
        prodConnection.rollback();
        logger.logError(e.message);
      }
    });
  }

  public async save({ connection, queries, prodConnection, callback }) {
    const logger = new Logger();
    const tuples = this.convertQueriesToTuple(queries);

    const promisifyQuery = promisify(connection.query).bind(connection);
    const promisifyProdQuery = promisify(prodConnection.query).bind(
      prodConnection
    );

    await promisifyProdQuery('set profiling = 1;');

    this.analyzeQueries({
      tuples,
      prodConnection,
      callback: async updatedTuples => {
        const values = this.prepareInsertValues(updatedTuples);

        const queryString = `insert into master.profile_replay_info
          (query_id, status, duration) values ${values}`;

        await promisifyProdQuery('set profiling = 0;');

        promisifyQuery(queryString)
          .then(() => {
            callback(true);
            analyzeProgress.profileResultInserted();
          })
          .catch(insertError => {
            logger.logError(insertError.message);
            connection.rollback();
          });
      },
    });
  }

  public async getProfileInfo(tables, callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const logger = new Logger();
    const statusesConfigurationDataStore = new StatusesConfigurationDataStore();

    let count = 0;

    await statusesConfigurationDataStore.checkStatusesConfigExist({
      connection,
      logger,
      callbackCountOfStatuses: currentCount => count = currentCount,
    });

    const searchTables =
      tables.length > 0 ? tables.map(table => `"${table}"`).join(', ') : '';

    const queriesWithoutStatuses = `
      select JSON_ARRAYAGG(replay_info.status) critical_statuses, JSON_ARRAYAGG(duration) duration, parametrized_queries.query_count, parametrized_queries.parsed_query
      from (
        select
          query_id,
          status,
          duration
        from profile_replay_info)
        as replay_info
      inner join filtered_queries on query_id = filtered_queries.id
      inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
      group by replay_info.query_id;
    `;

    const queriesWithProfileStatuses = `
      select replay_info.status as critical_statuses, duration, parametrized_queries.query_count, parametrized_queries.parsed_query
        from (
          select
            query_id,
            status,
            duration
          from profile_replay_info)
          as replay_info
        inner join statuses_configuration on statuses_configuration.value = replay_info.status
        inner join filtered_queries on query_id = filtered_queries.id
        inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
      where statuses_configuration.status = true and type = 'PROFILE';
    `;

    const queriesWithProfileStatusesWithTables = `
      select replay_info.status as critical_statuses, duration, parametrized_queries.query_count, parametrized_queries.parsed_query
        from (
          select
            query_id,
            status,
            duration
          from profile_replay_info)
          as replay_info
        inner join statuses_configuration on statuses_configuration.value = replay_info.status
        inner join filtered_queries on query_id = filtered_queries.id
        inner join queries_to_tables on filtered_queries.id = queries_to_tables.query_id
        inner join tables_statistic on queries_to_tables.table_id = tables_statistic.id and table_name in (${searchTables})
        inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
      where statuses_configuration.status = true and type = 'PROFILE';
    `;

    let query = queriesWithProfileStatuses;
    if (tables.length > 0) {
      query = queriesWithProfileStatusesWithTables;
    }

    if (count === 0 && tables.length === 0){
      query = queriesWithoutStatuses
    } else if (count > 0 && tables.length > 0){
      query = queriesWithProfileStatusesWithTables
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

export default ProfileQueriesDataStore;
