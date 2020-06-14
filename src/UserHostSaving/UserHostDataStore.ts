import { promisify } from 'util';
import { logger } from '../helpers/Logger';

class UserHostDataStore {
  private saveUserHostQueryRelation({ connection, tuples, selectHostResult }) {
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

    const values = hostQueryRelation.map(({parametrized_query_id, id}) => [`${parametrized_query_id}`, `${id}`, 1])

    const insertRelation = `
      insert into master.queries_to_user_host (parametrized_query_id, user_host_id, query_count)
      values ?
      on duplicate key
      update query_count = query_count + 1
    `;

    promisifyQuery(insertRelation, [values]).catch(error => {
      logger.logError(error);
      connection.rollback();
    });
  }

  private getUserHosts({ connection, tuples }) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const selectUserHostString = `
      select id, user_host from master.user_host
    `;

    promisifyQuery(selectUserHostString)
      .then(result => {
        this.saveUserHostQueryRelation({
          connection,
          tuples,
          selectHostResult: result,
        });
      })
      .catch(error => {
        connection.rollback();
        logger.logError(error);
      });
  }

  /**
   *
   * @param connection
   * @param tuples
   */
  public saveUserHosts({ connection, tuples }) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const uniqHosts = [...new Set(tuples.map(({ user_host }) => user_host))];

    uniqHosts.forEach((userHost, index) => {
      const insertHostString = `
        insert into master.user_host (user_host) 
        values ("${userHost}")
      `;

      promisifyQuery(insertHostString)
        .then(() => {
          if (index === uniqHosts.length - 1) {
            this.getUserHosts({ connection, tuples });
          }
        })
        .catch(e => {
          logger.logError(e);
          connection.rollback();
        });
    });
  }
}

export default UserHostDataStore;
