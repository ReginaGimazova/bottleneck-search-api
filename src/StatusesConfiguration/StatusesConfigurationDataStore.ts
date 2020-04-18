import { MysqlError } from 'mysql';

import DBConnection from '../helpers/DBConnection/DBConnection';
import Logger from '../helpers/Logger';

class StatusesConfigurationDataStore {
  getAll(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    connection.query('select id, value, type, status from master.statuses_configuration;', (err: MysqlError, result: any) => {
      if (result) {
        callback(result, undefined);
      }
      if (err) {
        logger.setLevel('error');
        logger.logError(err);
        callback(undefined, err);
      }
    });
    connection.end();
  }
}

export default StatusesConfigurationDataStore;
