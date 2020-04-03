import { MysqlError, createConnection } from 'mysql';
import rejectSourceTypes from '../config/constants';
import connectionConfig from "../config/connectionConfig";
import RejectedQueryDataStore from '../RejectedQueriesSaving/RejectedQueryDataStore';
import usedTablesReceiver from "./UsedTablesReceiver";

class TablesStatisticDataStore {
  save() {
    const tablesNameList = [];
    const rejectedQueryDataStore = new RejectedQueryDataStore();

    const connection = createConnection({
      ...connectionConfig,
    });

    connection.query(
      'select query_text from master.suitable_original_queries;',
      (error, queries) => {
        queries.forEach(({ query_text }) => {
          const { error: parserError = '', tables = [] } = usedTablesReceiver(query_text);

          if (parserError) {
            rejectedQueryDataStore.save({
              connection,
              errorText: parserError,
              rejectedQuery: query_text,
              type: rejectSourceTypes.PARSER
            });
          } else if (tables.length > 0 && !parserError) {
            tables.forEach(table => {
              tablesNameList.push(`('${table}', 1)`);
            });
          }
        });

        const commaSeparatedTableNames = tablesNameList.join(', ');

        connection.query(
          `insert into master.tables_statistic (table_name, call_count) values ${commaSeparatedTableNames} on duplicate key update call_count = call_count + 1;`,
          (tablesError: MysqlError) => {
            console.log(tablesError, 'err');
          }
        );
      }
    );
  }

  getAll(callback) {
    const connection = createConnection({ ...connectionConfig });
    connection.query(
      'select id, table_name, call_count from master.tables_statistic order by call_count asc;',
      (error, result) => {
        if (error) {
          console.log('get table statistic error', error);
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
