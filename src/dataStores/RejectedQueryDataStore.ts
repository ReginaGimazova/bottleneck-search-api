import { createConnection } from 'mysql';
import connectionConfig from '../config/connectionConfig';

class RejectedQueryDataStore {
  save(errorText = '', rejectedQuery = '', type = '') {
    const connection = createConnection({
      ...connectionConfig,
    });

    connection.query(
      `insert into master.rejected_original_queries (error_text, query_text, type) values ('${errorText}', '${rejectedQuery}', '${type}')`,
      (error, result) => {
        console.log(error);
      }
    );

    connection.end()
  }
}

export default RejectedQueryDataStore;
