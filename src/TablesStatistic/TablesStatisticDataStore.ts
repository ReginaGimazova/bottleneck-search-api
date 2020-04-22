import { MysqlError } from 'mysql';
import RejectedQueryDataStore from '../RejectedQueriesSaving/RejectedQueryDataStore';
import usedTablesReceiver from './UsedTablesReceiver';
import Logger from '../helpers/Logger';
import DBConnection from '../DatabaseAccess/DBConnection';

class TablesStatisticDataStore {
  // TODO: combine function with getAll in FilteredQueryDataStore

  /**
   *
   * @param table_ids
   * @param query_id
   *
   * This function takes tuple as argument and returns ready for insert query string
   * table_ids, query_id - tuple fields
   */
  private convertTupleToQueryString({table_ids, query_id}) {
    return table_ids.map(tableId => {
      return `('${query_id}', '${tableId}')`;
    });
  }

  /**
   *
   * @param connection
   * @param callback
   *
   */
  private getAllFilteredQueries(connection, callback) {
    const logger = new Logger();

    connection.query(
      'select id, query_text from master.filtered_queries',
      (error: MysqlError, result) => {
        if (result) {
          callback(result);
        } else if (error) {
          logger.logError(error);
          callback([]);
        }
      }
    );
  }

  private parseTablesFromQuery({ query_text, connection }) {
    const rejectedQueryDataStore = new RejectedQueryDataStore();

    const { error: parserError = '', tables = [] } = usedTablesReceiver(
      query_text
    );

    if (parserError) {
      rejectedQueryDataStore.save({
        connection,
        errorText: parserError,
        rejectedQuery: query_text,
        type: 'PARSER',
      });
    }

    return tables;
  }

  private saveQueryToTablesRelation(connection, isThroughFinalQuery, tuple) {
    const logger = new Logger();
    const insertQuery = this.convertTupleToQueryString(tuple).join(', ');

    connection.query(
      `insert into master.queries_to_tables (query_id, table_id) VALUES ${insertQuery}`,
      (queryTableError: MysqlError, result) => {
        if (queryTableError) {
          logger.logError(queryTableError);
          connection.rollback();
        } else if (result && isThroughFinalQuery) {
          connection.commit();
          console.log('Table - queries relations successfully saved.')
          connection.end();
        }
      }
    );
  }

  // TODO: refactor method

  save(connection) {
    const logger = new Logger();

    this.getAllFilteredQueries(connection, queries => {
      if (!queries.length) {
        return;
      }

      queries.forEach((query, index) => {
        const { query_text, id } = query;
        const tables = this.parseTablesFromQuery({ query_text, connection });
        const tuple = {
          query_id: id,
          table_ids: [...new Set()],
        };

        tables.forEach((table, tableIndex) => {
          const tableValue = `('${table}', 1)`;

          const insertQueryString = `
              insert into master.tables_statistic (table_name, call_count) 
              values ${tableValue} 
              on duplicate key update call_count = call_count + 1;`;

          const isThroughFinalQuery = index === queries.length - 1;
          const isThroughFinalTable = tableIndex === tables.length - 1;

          connection.query(
            insertQueryString,
            (tablesError: MysqlError, result) => {
              if (tablesError) {
                logger.logError(tablesError);
                connection.rollback();
              } else if (result) {
                tuple.table_ids.push(result.insertId);

                if (isThroughFinalTable) {
                  this.saveQueryToTablesRelation(
                    connection,
                    isThroughFinalQuery,
                    tuple
                  );
                }
              }
            }
          );
        });
      });
    });
  }

  getAll(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    connection.query(
      'select id, table_name, call_count from master.tables_statistic order by call_count asc;',
      (error, result) => {
        if (error) {
          logger.logError(error);
          callback(undefined, error);
          connection.end();
        } else if (result) {
          callback(result, undefined);
        }
      }
    );
  }
}

export default TablesStatisticDataStore;
