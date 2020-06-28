import DBConnection from '../DatabaseAccess/DBConnection';
import { promisify } from 'util';
import {logger} from '../helpers/Logger';
const { DB_DATABASE } = process.env;

class CheckTableInDatabase {
  /**
   *
   * @param tableName
   * @summary Return query string, ready for call
   */
  private checkTableStatement(tableName) {
    return `
      SELECT count(*) count
      FROM information_schema.TABLES
      WHERE (TABLE_SCHEMA = "${DB_DATABASE}") AND (TABLE_NAME = "${tableName}")
    `;
  }

  /**
   *
   * @param tableName
   *
   * @summary Check that table exists in tool database. Returns true, if table exists, and returns false if doesn't exist
   */
  public async checkTable(tableName) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);

    try {
      const result = await promisifyQuery(this.checkTableStatement(tableName));
      connection.end();
      return !!result[0].count;
    } catch (error) {
      logger.logError(error);
      connection.end();
      return false
    }
  }
}

export const checkTableInDatabase = new CheckTableInDatabase();
