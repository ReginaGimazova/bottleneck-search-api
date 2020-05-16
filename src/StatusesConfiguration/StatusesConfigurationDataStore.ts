import { MysqlError } from 'mysql';

import DBConnection from '../DatabaseAccess/DBConnection';
import Logger from '../helpers/Logger';

class StatusesConfigurationDataStore {
  save(statusesId = [], callback){
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const logger = new Logger();

    const idsToString =
        statusesId.length > 0 ? statusesId.map(id => `"${id}"`).join(', ') : '';

    connection.query(`update statuses_configuration set status =  IF(id in (${idsToString}), 1, 0);`,
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
