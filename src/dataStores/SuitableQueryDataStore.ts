import { createConnection, MysqlError} from 'mysql';
import connectionConfig from '../config/connectionConfig';
import TablesStatisticDataStore from "./TablesStatisticDataStore";
import ParametrizedQueriesDataStore from "./ParametrizedQueriesDataStore";

class SuitableQueryDataStore {
  save() {
    const connection = createConnection({
      ...connectionConfig,
    });

    connection.beginTransaction();

    connection.query('select filter_query, type from filter', (error, result) => {
      result.forEach(({filter_query, type}) => {
        connection.query(
          ` select argument, user_host from original_queries 
            where  argument != '${filter_query}' or argument not like '${filter_query}';`,
            (insetError: MysqlError, res) => {
              console.log(insetError, res)
              if (insetError) {
                connection.rollback((rollbackError: MysqlError) => {
                  if (rollbackError) {
                    return rollbackError.message;
                  }
                  else {
                    return insetError.message
                  }
                });
              }
            }
        );
      })
    });
    /*connection.query(
      'insert into suitable_original_queries (query_text, user_host) select argument from original_queries where argument != ;',
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
    );*/
    const queries = [];
    const tablesStatisticDataStore = new TablesStatisticDataStore();
    const parametrizedQueriesDataStore = new ParametrizedQueriesDataStore();

    connection
      .query('select id, query_text from suitable_original_queries;', (err, result) => {
        if (result) {

          Object.keys(result).forEach(key => {
            queries.push(result[key]);
          });

        //  tablesStatisticDataStore.save(connection, queries);
        //  parametrizedQueriesDataStore.save(connection, queries);
        }
      });

    connection.commit();
    //connection.end();
  };

  getAll(callback){
     const queries = [];

    const connection = createConnection({
      ...connectionConfig
    });

    connection.query('select id, query_text from suitable_original_queries;', (err: MysqlError, result: any) => {
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