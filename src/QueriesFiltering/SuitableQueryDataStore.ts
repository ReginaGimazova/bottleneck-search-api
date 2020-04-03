import { createConnection, MysqlError} from 'mysql';
import TablesStatisticDataStore from "../TablesStatisticReceiving/TablesStatisticDataStore";
import ParametrizedQueriesDataStore from "../OriginalQueriesParametrizing/ParametrizedQueriesDataStore";
import connectionConfig from "../config/connectionConfig";

class SuitableQueryDataStore {
  save() {
    const connection = createConnection({
      ...connectionConfig,
    });

    const tablesStatisticDataStore = new TablesStatisticDataStore();
    const parametrizedQueriesDataStore = new ParametrizedQueriesDataStore();

    connection.query('insert into master.suitable_original_queries (user_host, query_text) select user_host, argument from original_queries ' +
       'cross join filter where argument != filter_query and argument not like filter_query;', (error: MysqlError, result) => {
      if (result){
        tablesStatisticDataStore.save();
      }
   });

    connection.end();

    //  parametrizedQueriesDataStore.save(connection);

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