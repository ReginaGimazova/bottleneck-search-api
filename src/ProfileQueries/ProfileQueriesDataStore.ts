import { promisify } from 'util';
import { MysqlError } from 'mysql';

import {logger} from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import DBConnection from '../DatabaseAccess/DBConnection';
import StatusesConfigurationDataStore from '../StatusesConfiguration/StatusesConfigurationDataStore';

class ProfileQueriesDataStore {
  /**
   *
   * @param queries - filtered queries
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
    tuples
      .map(({ id, result }) =>
        result
          .map(
            ({ Status, Duration }) => `('${id}', '${Status}', '${Duration}')`
          )
          .join(', ')
      )
      .join(', ');

  /**
   *
   * @param tuples - tuples, created in convertQueriesToTuple method (result = undefined)
   * @param connection - connection to tool database
   * @param prodConnection - connection to production database, which contains original info
   */
  private analyzeQueries({ tuples, callback, prodConnection }) {
    const promisifyQuery = promisify(prodConnection.query).bind(prodConnection);

    tuples.forEach(async ({ query_text }, index) => {
      try {
        const multipleQueryResult = await promisifyQuery(`
          ${query_text}; 
          show profile;`);
        tuples[index].result = multipleQueryResult[1];

        if (index === tuples.length - 1) {
          callback(tuples);
        }
      } catch (e) {
        logger.logError(e.message);
      }
    });
  }

  /**
   *
   * @param connection
   * @param prodConnection
   * @param queries
   * @param callback
   */
  public async save({ connection, prodConnection, queries, callback }) {
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

  public updateProfileResult(profileResultCallback){
    // TODO: complete, create common class for Explain and Profile
  }

  /**
   *
   * @param tables - a set of tables for find matching queries
   * @param callback - returns the retrieving rows by search tables and PROFILE statuses configuration
   */
  public async getProfileInfo(tables, callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const statusesConfigurationDataStore = new StatusesConfigurationDataStore();

    let count = 0;

    await statusesConfigurationDataStore.checkStatusesConfigExist({
      connection,
      type: 'profile',
      callbackCountOfStatuses: currentCount => count = currentCount,
    });

    const tablesJoinPart = `
      inner join queries_to_tables on filtered_queries.id = queries_to_tables.query_id
      inner join tables_statistic on queries_to_tables.table_id = tables_statistic.id
      and json_search(json_array('app', 'user'), 'all', table_name) > 0
    `;

    const withoutStatuses = `
      select
        json_unquote(json_arrayagg(json_object('status', replay_info.status, 'duration', replay_info.duration))) critical_statuses,
        parametrized_queries.parsed_query,
        parametrized_queries.query_count
      from (
        select
           query_id,
           status,
           duration
        from profile_replay_info)
        as replay_info
      inner join parametrized_queries on replay_info.query_id = parametrized_queries.id
      ${tables.length > 0 ? tablesJoinPart : ''}
      group by query_id;
    `;

    // TODO: duplicates in statuses

    const withStatuses = `
      select
        json_arrayagg (
          json_object (
            'status', profile_replay_info.status,
            'duration', profile_replay_info.duration
          )
        ) critical_statuses,
        parametrized_queries.parsed_query,
        parametrized_queries.query_count
      from
        parametrized_queries
        inner join filtered_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
        inner join profile_replay_info on filtered_queries.id = profile_replay_info.query_id
        inner join statuses_configuration on statuses_configuration.value = profile_replay_info.status
        ${tables.length > 0 ? tablesJoinPart : ''}
      where statuses_configuration.mode = true and type = 'PROFILE'
      group by parametrized_queries.parsed_query_hash;
    `;

    const query = count === 0 ? withoutStatuses : withStatuses;

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
