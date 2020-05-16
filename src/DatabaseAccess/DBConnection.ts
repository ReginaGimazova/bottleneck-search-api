import {Connection, createConnection} from 'mysql';
// tslint:disable-next-line:no-var-requires
require('dotenv').config()

const { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;

const connectionConfig = {
  multipleStatements: true,
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE
}

const prodConnectionConfig = {
  host: 'localhost',
  user: 'root',
  password: '34Zc18WfLn',
  database: 'test'
}

class DBConnection {
  createProdConnection() : Connection {
    return createConnection({
      ...prodConnectionConfig,
    });
  }

  createToolConnection() : Connection {
    return createConnection({
      ...connectionConfig
    })
  }
}

export default DBConnection;