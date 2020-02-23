import { createConnection, MysqlError} from 'mysql';
import connectionConfig from '../config/connectionConfig';
import {getTableList} from "../parser";

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
    const tableList = [];

    await connection.query(
      'select query_text from suitable_original_queries;', (error: MysqlError, result: any) => {
         if (result){
           Object.keys(result).forEach(key => {
             const tables = getTableList(result[key].query_text);
             tableList.concat(tables);
           })
         }
         if (error) {
           // rollback
         }
      }
    );

    tableList.forEach(table => {
      connection.query(
        `insert into test.tables_statistic (table_name, table_name_hash, call_count) values (${table}, sha(${table}), 1) ` +
        `on duplicate key update call_count = call_count + 1;`
      , (tablesError: MysqlError) => {
          console.log(tablesError)
        })
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