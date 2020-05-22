import { MysqlError } from 'mysql';

import DBConnection from '../DatabaseAccess/DBConnection';
import Logger from '../helpers/Logger';
import {promisify} from "util";

class StatusesConfigurationDataStore {
  save(statusesId = [], callback){
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const logger = new Logger();

    const idsToString =
        statusesId.length > 0 ? statusesId.map(id => `"${id}"`).join(', ') : '';

    connection.query(`update statuses_configuration set status = IF(id in (${idsToString}), 1, 0);`,
      (err: MysqlError, result: any) => {
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

  addStatus(newStatusData, callback){
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const logger = new Logger();

    const {status, value, type} = newStatusData;
    const queryString = 'insert into statuses_configuration (value, type, status) values ?'
    const values = [[`${value}`, `${type.toUpperCase()}`, `${status}`]];

    connection.query(queryString, [values],
      (error: MysqlError, result: any ) => {
        if (result){
          callback(result, undefined)
        } else {
          logger.logError(error);
          callback(undefined, error)
        }
      })
  }

  async checkStatusesConfigExist({connection, logger, callbackCountOfStatuses}){
    const promisifyQuery = promisify(connection.query).bind(connection);

    const query = 'select count(id) as count from master.statuses_configuration;'
    try {
      const result = await promisifyQuery(query);
      callbackCountOfStatuses(result[0].count)
    } catch (e) {
      logger.logError(e);
    }
  }

  getAll(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const logger = new Logger();

    connection.query('select id, value, type, status from master.statuses_configuration;', (err: MysqlError, result: any) => {
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

export default StatusesConfigurationDataStore;
