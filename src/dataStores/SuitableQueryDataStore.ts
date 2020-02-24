import { createConnection, MysqlError} from 'mysql';
import connectionConfig from '../config/connectionConfig';
import TablesStatisticDataStore from "./TablesStatisticDataStore";
import ParametrizedQueriesDataStore from "./ParametrizedQueriesDataStore";

class SuitableQueryDataStore {
  async save() : Promise<any> {
    const connection = createConnection({
      ...connectionConfig,
    });

    await connection.beginTransaction();

    await connection.query(
      'insert into suitable_original_queries (query_text, user_host) select argument, user_host from original_queries where argument like "select%";',
        (error: MysqlError) => {
          if (error) {
            connection.rollback((rollbackError: MysqlError) => {
              if (rollbackError) {
                return rollbackError.message;
              }
              else {
                return error.message
              }
            });
          }
        }
    );
    const queries = [];
    const tablesStatisticDataStore = new TablesStatisticDataStore();
    const parametrizedQueriesDataStore = new ParametrizedQueriesDataStore();

    await connection
      .query('select (id, query_text) from suitable_original_queries;', async (err, result) => {
        Object.keys(result).forEach(key => {
          queries.push(result[key]);
        });

        await tablesStatisticDataStore.save(connection, queries);
        await parametrizedQueriesDataStore.save(connection, queries);
      });

    await connection.commit();
    await connection.end();
  };

  async getAll(callback) : Promise<any>{
     const queries = [];

    const connection = createConnection({
      ...connectionConfig
    });

    await connection.query('select id, query_text from suitable_original_queries', (err: MysqlError, result: any) => {
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
    await connection.end();
  }
}

export default SuitableQueryDataStore;