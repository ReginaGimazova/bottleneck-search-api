import {Connection, createConnection} from 'mysql';

class DBConnection {
  create(connectionConfig) : Connection {
    return createConnection({
      ...connectionConfig,
    });
  }
}

export default DBConnection;