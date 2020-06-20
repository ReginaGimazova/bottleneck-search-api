import { MysqlError } from 'mysql';
import { promisify } from 'util';

import DBConnection from '../DatabaseAccess/DBConnection';
import { logger } from '../helpers/Logger';

class StatusesConfigurationDataStore {
  /**
   *
   * @param statuses - all statuses from FE, which containt statuses with updated modes
   * @param callback - return updated statuses
   */
  update(statuses = [], callback) {
    const connection = new DBConnection().createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);

    connection.beginTransaction(error => {
      if (error) {
        logger.logError(error);
        connection.end();
      } else {
        statuses.forEach((status, index) => {
          promisifyQuery(
            `
              update master.statuses_configuration
              set mode = "${status.mode}"
              where value = "${status.value}"
            `
          )
            .then(() => {
              if (index === statuses.length - 1) {
                connection.commit();
                connection.end();
                callback(true, undefined);
              }
            })
            .catch(updateError => {
              logger.logError(updateError);
              callback(false, updateError);
              connection.rollback();
              connection.end();
            });
        });
      }
    });
  }

  /**
   *
   * @param newStatusData - new configuration status which contains value, type: Explain or Profile and mode
   * @param callback - return error or success insert message
   */
  addStatus(newStatusData, callback) {
    const connection = new DBConnection().createToolConnection();

    const { mode, value, type } = newStatusData;
    const queryString =
      'insert into master.statuses_configuration (value, type, mode) values ?';
    const values = [[`${value}`, `${type.toUpperCase()}`, `${mode}`]];

    connection.query(
      queryString,
      [values],
      (error: MysqlError, result: any) => {
        if (result) {
          connection.commit();
          callback(result, undefined);
        } else {
          logger.logError(error);
          callback(undefined, error);
        }
      }
    );
  }

  /**
   *
   * @param statusValue - value of status which must be removed
   * @param callback - return error or success removing message
   */
  removeStatus(statusValue, callback) {
    const connection = new DBConnection().createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);
    const { value, type } = statusValue;

    const statement = `delete from master.statuses_configuration where value = "${value}" and type = "${type}"`;

    promisifyQuery(statement)
      .then(result => {
        connection.commit();
        callback(result, undefined)
      })
      .catch(removeError => {
        callback(undefined, removeError.message)
      })
  }

  /**
   *
   * @param connection - tool connection
   * @param type - type of configuration status: Explain or Profile
   * @param callbackCountOfStatuses - callback which returns count of statuses for this type
   */
  async checkStatusesConfigExist({
    connection,
    type,
    callbackCountOfStatuses,
  }) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const query = `select count(id) as count from master.statuses_configuration where mode = 1 and type = "${type}";`;
    try {
      const result = await promisifyQuery(query);
      callbackCountOfStatuses(result[0].count);
    } catch (e) {
      logger.logError(e);
    }
  }

  /**
   *
   * @param callback - return all status configurations
   */
  getAll(callback) {
    const connection = new DBConnection().createToolConnection();

    connection.query(
      'select id, value, type, mode from master.statuses_configuration;',
      (err: MysqlError, result: any) => {
        if (result) {
          callback(result, undefined);
        }
        if (err) {
          logger.logError(err);
          callback(undefined, err);
        }
      }
    );
    connection.end();
  }
}

export default StatusesConfigurationDataStore;
