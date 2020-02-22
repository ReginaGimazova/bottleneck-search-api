import { createConnection } from 'mysql';
import connectionConfig from '../config/connectionConfig';

class RejectedQueryDataStore {
  save () {
    const connection = createConnection({
      ...connectionConfig
    });

    connection.query (
      'insert into rejected_original_queries (query_text) select argument from original_queries where argument not like "select%"',
       (error) => {
          console.log('get rejected query', error);
       }
    )
  }
}

export default RejectedQueryDataStore;