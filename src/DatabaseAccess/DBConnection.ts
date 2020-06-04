import { Connection, createConnection } from 'mysql';
// tslint:disable-next-line:no-var-requires
require('dotenv').config();

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
  PROD_HOST,
  PROD_DB_USER,
  PROD_DB_PASSWORD,
  PROD_DATABASE,
} = process.env;

const connectionConfig = {
  multipleStatements: true,
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
};

const prodConnectionConfig = {
  host: PROD_HOST,
  user: PROD_DB_USER,
  password: PROD_DB_PASSWORD,
  database: PROD_DATABASE,
};

/**
 * prodConnectionConfig - connection config to database with original tables on production server
 * connectionConfig - connection config to the database of this tool
 */

class DBConnection {
  createProdConnection(): Connection {
    return createConnection({
      ...prodConnectionConfig,
    });
  }

  createToolConnection(): Connection {
    return createConnection({
      ...connectionConfig,
    });
  }
}

export default DBConnection;
