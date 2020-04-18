import { createConnection, Connection } from 'mysql';
import connectionConfig from './connectionConfig';

class DBConnection {
  create() : Connection {
    const connection = createConnection({
      ...connectionConfig,
    });
    connection.config.queryFormat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    return connection;
  }
}

export default DBConnection;