import {Connection, createConnection} from 'mysql';

const { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;

const connectionConfig = {
  multipleStatements: true,
  host: "bottleneck-search-db.cabco5nswhst.us-east-1.rds.amazonaws.com",
  user: "admin",
  password: "admin-amazon",
  database: "master"
}

class DBConnection {
  create() : Connection {
    return createConnection({
      ...connectionConfig,
    });
  }
}

export default DBConnection;