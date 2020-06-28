import { promisify } from 'util';
import { logger } from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';

class UserHostDataStore {

  /**
   *
   * @param connection - tool database connection
   * @param queriesTuples - queries tuples, that contain the following data: user_host, argument, parametrized_query_id
   * @param selectHostResult - result from select query
   *
   * @summary This function save user_host-parametrized_queries relation to queries_to_user_host table
   */
  private async saveUserHostQueryRelation({
    connection,
    queriesTuples,
    selectHostResult,
  }) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const hostQueryRelation = [];

    queriesTuples.forEach(({ user_host, parametrized_query_id }) => {
      selectHostResult.forEach(({ id, user_host: savedUserHost }) => {
        if (user_host === savedUserHost) {
          hostQueryRelation.push({
            parametrized_query_id,
            id,
          });
        }
      });
    });

    const values = hostQueryRelation.map(({ parametrized_query_id, id }) => [
      `${parametrized_query_id}`,
      `${id}`,
      1,
    ]);

    const insertRelation = `
      insert into master.queries_to_user_host (parametrized_query_id, user_host_id, query_count)
      values ?
      on duplicate key
      update query_count = query_count + 1
    `;

    try {
      await promisifyQuery(insertRelation, [values]);
      logger.logInfo('User host relations saved');
      await analyzeProgress.updateProgress();
    } catch (error) {
      logger.logError(error);
      connection.rollback();
    }
  }

  /**
   *
   * @param connection - tool database connection
   * @param queriesTuples - queries tuples, that contain the following data: user_host, argument, parametrized_query_id
   *
   * @summary This function select all user hosts and provide them to saveUserHostQueryRelation function
   */
  private async getUserHosts({ connection, queriesTuples }) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const selectUserHostString = `
      select id, user_host from master.user_host
    `;

    try {
      const result = await promisifyQuery(selectUserHostString);
      await this.saveUserHostQueryRelation({
        connection,
        queriesTuples,
        selectHostResult: result,
      });
    } catch (error) {
      await analyzeProgress.resetCounter();
      connection.rollback();
      logger.logError(error);
    }
  }

  /**
   *
   * @param connection - tool connection
   * @param queriesTuples - queries tuples, that contain the following data: user_host, argument, parametrized_query_id
   *
   * @summary Save unique user hosts to user_host table
   */
  public saveUserHosts({ connection, queriesTuples }) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const uniqHosts = [...new Set(queriesTuples.map(({ user_host }) => user_host))];

    uniqHosts.forEach(async (userHost, index) => {
      const insertHostString = `
        insert into master.user_host (user_host) 
        values ("${userHost}")
      `;

      try {
        await promisifyQuery(insertHostString);
        if (index === uniqHosts.length - 1) {
          await this.getUserHosts({ connection, queriesTuples });
        }
      } catch (e) {
        await analyzeProgress.resetCounter();
        logger.logError(e);
        connection.rollback();
      }
    });
  }
}

export default UserHostDataStore;
