import { createConnection } from 'mysql';
import connectionConfig from '../config/connectionConfig';

class SuitableQueryDataStore {
  save() : void {
    const connection = createConnection({
      ...connectionConfig,
    });

    connection.query(
      'insert into suitable_original_queries (query_text, user_host) select argument, user_host from original_queries where argument like "select%"',
      (error) => {
        console.log('get suitable query', error);
      }
    );
    connection.end();
  };

  async getAll(callback) {
     const queries = [];

    const connection = createConnection({
      ...connectionConfig
    });

    await connection.query('select id, query_text from suitable_original_queries', (err, result) => {
      if (result){
        Object.keys(result).forEach(key => {
          queries.push(JSON.stringify(result[key]));
        });
        callback(queries, undefined);
      }
      if (err) {
        callback(undefined, err)
      }
    });
    connection.end();
  }
}

export default SuitableQueryDataStore;