import { promisify } from 'util';
import { MysqlError } from 'mysql';

import {logger} from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import DBConnection from '../DatabaseAccess/DBConnection';
import StatusesConfigurationDataStore from '../StatusesConfiguration/StatusesConfigurationDataStore';
import FilteredQueryDataStore from "../FilteredQueries/FilteredQueryDataStore";
import QueriesDataStoreBase from "../QueriesDataStoreBase";

class ProfileQueriesDataStore extends QueriesDataStoreBase {
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
  private prepareInsertValues = tuples =>
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
      const queryString = `
        ${query_text}; 
        show profile;
      `;

      try {
        const multipleQueryResult = await promisifyQuery(queryString);
        tuples[index].result = multipleQueryResult[1];

        if (index === tuples.length - 1) {
          return callback(tuples);
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
   * @param isUpdate - if run only PROFILE update, not all file analyze, updateProgress shouldn't be called
   * @param queries
   * @param callback
   */
  public async save({ connection, prodConnection, isUpdate = false, queries, callback }) {
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

        const queryString = `
          insert into master.profile_replay_info
          (query_id, status, duration) values ${values}`;

        await promisifyProdQuery('set profiling = 0;');

        try {
          await promisifyQuery(queryString);
          logger.logInfo('PROFILE result saved');
          if (!isUpdate) {
            await analyzeProgress.updateProgress();
          }
          return callback(true);

        } catch (insertError){
          logger.logError(insertError.message);
          if (!isUpdate) {
            await analyzeProgress.resetCounter();
          }
          connection.rollback();
        }
      },
    });
  }

  public updateProfileResult(profileResultCallback){
    // TODO: create common class for Explain and Profile
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const prodConnection = dbConnection.createProdConnection();

    const filteredQueryDataStore = new FilteredQueryDataStore();
    filteredQueryDataStore
      .getAllFilteredQueries(connection)
      .then(async queries => {
        await this.save({connection, prodConnection, queries, isUpdate: true, callback: (inserted => {
          if (inserted){
            connection.commit();
            connection.end();
            prodConnection.end();
            return profileResultCallback(
              {status: inserted},
              inserted ? undefined : new Error('There was an error in analyze queries by PROFILE'));
          }
          })});
      })
      .catch(async error => {
        await analyzeProgress.resetCounter();
        logger.logError(error.message);
        connection.end();
        prodConnection.end();
      })
  }

  protected tablesQueryBuild(tables): string {
    return super.tablesQueryBuild(tables);
  }

  /**
   *
   * @param tables - a set of tables for find matching queries
   * @param callback - returns the retrieving rows by search tables and PROFILE statuses configuration
   */
  public async getProfileInfo(tables, callback) {
    const connection = new DBConnection().createToolConnection();
    const statusesConfigurationDataStore = new StatusesConfigurationDataStore();

    let count = 0;

    await statusesConfigurationDataStore.checkStatusesConfigExist({
      connection,
      type: 'profile',
      callbackCountOfStatuses: currentCount => count = currentCount,
    });

    const tablesJoinPart =  this.tablesQueryBuild(tables);

    const withoutStatuses = `
      select
        json_arrayagg(json_object('status', replay_info.status, 'duration', replay_info.duration)) critical_statuses,
        master.parametrized_queries.parsed_query,
        queries_to_user_host.query_count
      from (
        select
           query_id,
           status,
           duration
        from master.profile_replay_info)
        as replay_info
      inner join master.parametrized_queries on replay_info.query_id = parametrized_queries.id
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

    const withStatuses = `
      select
        json_arrayagg (
          json_object (
            'status', master.profile_replay_info.status,
            'duration', profile_replay_info.duration,
            'statusId', profile_replay_info.id
          )
        ) critical_statuses,
        master.parametrized_queries.parsed_query,
        queries_to_user_host.query_count
      from
        master.parametrized_queries
        inner join master.filtered_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
        inner join master.profile_replay_info on filtered_queries.id = profile_replay_info.query_id
        inner join master.statuses_configuration on statuses_configuration.value = profile_replay_info.status
        inner join (
          select
            parametrized_query_id,
            sum(query_count) as query_count
          from master.queries_to_user_host
          group by parametrized_query_id) as queries_to_user_host
        on parametrized_queries.id = queries_to_user_host.parametrized_query_id
        ${tables.length > 0 ? tablesJoinPart : ''}
      where statuses_configuration.mode = true and type = 'PROFILE'
      group by parametrized_queries.parsed_query_hash
      order by query_count desc;
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
