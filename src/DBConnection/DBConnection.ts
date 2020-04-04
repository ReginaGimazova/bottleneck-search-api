import { createConnection, Connection } from 'mysql';
import connectionConfig from './connectionConfig';

class DBConnection {
  create() : Connection {
    const connection = createConnection({
      ...connectionConfig,
    });
    return connection;
  }
}

export default DBConnection;