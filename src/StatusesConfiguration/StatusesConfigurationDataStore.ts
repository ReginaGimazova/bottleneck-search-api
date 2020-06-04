import { MysqlError } from 'mysql';

import DBConnection from '../DatabaseAccess/DBConnection';
import {logger} from '../helpers/Logger';
import { promisify } from 'util';

class StatusesConfigurationDataStore {
  update(statuses = [], callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);

    connection.beginTransaction(error => {
      if (error) {
        logger.logError(error);
        connection.end();
      } else {
        statuses.forEach((status, index) => {
          promisifyQuery(
            `
              update statuses_configuration
              set mode = "${status.mode}"
              where value = "${status.value}"
            `
          )
            .then(updateResult => {
              if (index === statuses.length - 1){
                connection.commit();
                connection.end();
                callback(updateResult, undefined);
              }
            })
            .catch(updateError => {
              logger.logError(updateError);
              callback(undefined, updateError);
              connection.rollback();
              connection.end();
            });
        });
      }
    });
  }

  addStatus(newStatusData, callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();

    const { status, value, type } = newStatusData;
    const queryString =
      'insert into statuses_configuration (value, type, mode) values ?';
    const values = [[`${value}`, `${type.toUpperCase()}`, `${status}`]];

    connection.query(
      queryString,
      [values],
      (error: MysqlError, result: any) => {
        if (result) {
          callback(result, undefined);
        } else {
          logger.logError(error);
          callback(undefined, error);
        }
      }
    );
  }

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

  getAll(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();

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
