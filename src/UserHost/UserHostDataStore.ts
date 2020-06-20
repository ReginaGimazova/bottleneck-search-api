import { promisify } from 'util';
import { logger } from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';

class UserHostDataStore {
  private async saveUserHostQueryRelation({
    connection,
    tuples,
    selectHostResult,
  }) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const hostQueryRelation = [];

    tuples.forEach(({ user_host, parametrized_query_id }) => {
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

  private async getUserHosts({ connection, tuples }) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const selectUserHostString = `
      select id, user_host from master.user_host
    `;

    try {
      const result = await promisifyQuery(selectUserHostString);
      await this.saveUserHostQueryRelation({
        connection,
        tuples,
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
   * @param connection
   * @param tuples
   */
  public saveUserHosts({ connection, tuples }) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const uniqHosts = [...new Set(tuples.map(({ user_host }) => user_host))];

    uniqHosts.forEach(async (userHost, index) => {
      const insertHostString = `
        insert into master.user_host (user_host) 
        values ("${userHost}")
      `;

      try {
        await promisifyQuery(insertHostString);
        if (index === uniqHosts.length - 1) {
          await this.getUserHosts({ connection, tuples });
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
