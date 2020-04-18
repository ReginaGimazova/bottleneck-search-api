import { MysqlError } from 'mysql';

import TablesStatisticDataStore from '../TablesStatistic/TablesStatisticDataStore';
import ParametrizedQueriesDataStore from '../QueriesParametrizing/ParametrizedQueriesDataStore';
import DBConnection from '../helpers/DBConnection/DBConnection';
import Logger from '../helpers/Logger';

class SuitableQueryDataStore {
  save(connection) {
    const logger = new Logger();

    const tablesStatisticDataStore = new TablesStatisticDataStore();
    const parametrizedQueriesDataStore = new ParametrizedQueriesDataStore();

    connection.query(
      'insert into master.suitable_original_queries (user_host, query_text) select user_host, argument from master.original_queries ' +
        'where not exists ( ' +
          'select 1 from master.filter ' +
            'where ' +
              'type = \'S\' ' +
              'and filter_query = original_queries.argument ' +
        'union ' +
          'select 1 from master.filter ' +
            'where ' +
              'type = \'R\' ' +
              'and original_queries.argument like filter_query);',

      (error: MysqlError, result) => {
        if (result) {
          tablesStatisticDataStore.save(connection);
          parametrizedQueriesDataStore.save(connection);
        } else if (error) {
          logger.setLevel('error');
          logger.logError(error);
          connection.end();
        }
      }
    );
  }

  getAll(callback) {
    const queries = [];

    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    connection.query(
      'select id, query_text from suitable_original_queries;',
      (err: MysqlError, result: any) => {
        if (result) {
          Object.keys(result).forEach(key => {
            queries.push(JSON.stringify(result[key]));
          });
          callback(queries, undefined);
        }
        if (err) {
          logger.setLevel('error');
          logger.logError(err);
          callback(undefined, err);
        }
      }
    );
    connection.end();
  }
}

export default SuitableQueryDataStore;
