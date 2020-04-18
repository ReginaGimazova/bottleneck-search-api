import { MysqlError } from 'mysql';
import rejectSourceTypes from '../helpers/config/constants';
import RejectedQueryDataStore from '../RejectedQueriesSaving/RejectedQueryDataStore';
import usedTablesReceiver from './UsedTablesReceiver';
import Logger from '../helpers/Logger';
import DBConnection from '../helpers/DBConnection/DBConnection';

class TablesStatisticDataStore {
  save(connection) {
    const tablesNameList = [];
    const rejectedQueryDataStore = new RejectedQueryDataStore();
    const logger = new Logger();

    connection.query(
      'select query_text from master.suitable_original_queries;',
      (error: MysqlError, queries) => {
        if (queries) {
          queries.forEach(({ query_text }) => {
            const { error: parserError = '', tables = [] } = usedTablesReceiver(
              query_text
            );

            if (parserError) {
              rejectedQueryDataStore.save({
                connection,
                errorText: parserError,
                rejectedQuery: query_text,
                type: rejectSourceTypes.PARSER,
              });
            } else if (tables.length > 0 && !parserError) {
              tables.forEach(table => {
                tablesNameList.push(`('${table}', 1)`);
              });
            }
          });
        }

        if (error) {
          logger.setLevel('error');
          logger.logError(error);
        }

        if (tablesNameList.length > 0) {
          const commaSeparatedTableNames = tablesNameList.join(', ');

          connection.query(
            `insert into master.tables_statistic (table_name, call_count) 
             values ${commaSeparatedTableNames} on duplicate key update call_count = call_count + 1;`,
            (tablesError: MysqlError) => {
              logger.setLevel('error');
              logger.logError(tablesError);
            }
          );
        }
      }
    );
  }

  getAll(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    connection.query(
      'select id, table_name, call_count from master.tables_statistic order by call_count asc;',
      (error, result) => {
        if (error) {
          logger.setLevel('error');
          logger.logError(error);
          callback(undefined, error);
          connection.end();
        } else if (result) {
          callback(result, undefined);
          connection.end();
        }
      }
    );
  }
}

export default TablesStatisticDataStore;
