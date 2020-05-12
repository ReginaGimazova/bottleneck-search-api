import { MysqlError } from 'mysql';

import DBConnection from '../DatabaseAccess/DBConnection';
import Logger from '../helpers/Logger';

class StatusesConfigurationDataStore {
  save(statusesId = [], callback){
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
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
    const connection = dbConnection.create();
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

  getAll(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
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
