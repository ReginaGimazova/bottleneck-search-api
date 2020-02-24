import {Connection, MysqlError, createConnection} from 'mysql';
import {getTableList} from "../parser";
import connectionConfig from '../config/connectionConfig';

class TablesStatisticDataStore {
  save(connection : Connection, queries: any[]){
    const tablesNameList = [];

    queries.forEach(query => {
      const tableList = getTableList(query.query_text);

      tableList.forEach(table => {
        const tableName = table.split('::')[2];
        tablesNameList.push(tableName);
      });
    });

    // TODO: maybe needs to refactor with 12 line
    const commaSeparatedTableNames = tablesNameList
        .map(value => `('${value}', 1)`)
        .join(', ');

      connection.query(
        `insert into test.tables_statistic (table_name, call_count) values ${commaSeparatedTableNames} on duplicate key update call_count = call_count + 1;`,
         (tablesError: MysqlError, result) => {
          console.log(tablesError, 'err');
      })
  };

  getAll(callback) {
    const connection = createConnection({...connectionConfig});
    connection.query('select id, table_name, call_count from test.tables_statistic;', (error, result) => {
      if (error){
        console.log('get table statistic error', error);
        callback(undefined, error)
      }
      else if (result) {
        callback(result, undefined)
      }
    })
  }
}

export default TablesStatisticDataStore;