import DBConnection from '../DatabaseAccess/DBConnection';
import { promisify } from 'util';
import {logger} from './Logger';
const { DB_DATABASE } = process.env;

class CheckTableInDatabase {
  private checkTableStatement(tableName) {
    return `
      SELECT count(*) count
      FROM information_schema.TABLES
      WHERE (TABLE_SCHEMA = "${DB_DATABASE}") AND (TABLE_NAME = "${tableName}")
    `;
  }

  public checkTable({ tableName, callbackCheckTable }) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);

    promisifyQuery(this.checkTableStatement(tableName))
      .then(result => {
        connection.end();
        callbackCheckTable(!!result[0].count);
      })
      .catch(error => {
        logger.logError(error);
        connection.end();
        callbackCheckTable(false);
      });
  }
}

export const checkTableInDatabase = new CheckTableInDatabase();
