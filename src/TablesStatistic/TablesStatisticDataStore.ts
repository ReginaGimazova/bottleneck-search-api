import { promisify } from 'util';
import countBy from 'lodash/countBy';

import RejectedQueryDataStore from '../RejectedQueriesSaving/RejectedQueryDataStore';
import usedTablesReceiver from './UsedTablesReceiver';
import Logger from '../helpers/Logger';
import DBConnection from '../DatabaseAccess/DBConnection';

class TablesStatisticDataStore {
  private createQueriesTuple(queriesArray) {
    return queriesArray.map(item => {
      return {
        query_id: item.id,
        table_ids: new Set(),
        tables: [],
      };
    });
  }

  /**
   *
   * @param table_ids
   * @param query_id
   *
   * This function takes tuple as argument and returns ready for insert query string
   * table_ids, query_id - tuple fields
   */
  private convertTupleToQueryString({ table_ids, query_id }) {
    return [...table_ids].map(tableId => {
      return `('${query_id}', '${tableId}')`;
    });
  }

  /**
   *
   * @param connection
   *
   */
  private getAllFilteredQueries(connection) {
    const promisifyQuery = promisify(connection.query).bind(connection);
    return promisifyQuery('select id, query_text from master.filtered_queries');
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

  private saveQueryToTablesRelation({ connection, tuple, isThroughFinalQuery }) {
    const promisifyQuery = promisify(connection.query).bind(connection);
    const logger = new Logger();

    const insertQuery = this.convertTupleToQueryString(tuple).join(', ');

    promisifyQuery(
      `insert into master.queries_to_tables (query_id, table_id) VALUES ${insertQuery}`
    )
      .then(result => {
        if (result && isThroughFinalQuery) {
          connection.commit();
          console.log('Table - queries relations successfully saved.');
          connection.end();
        }
      })
      .catch(queryTableError => {
        logger.logError(queryTableError);
        connection.rollback();
      });
  }

  /**
   *
   * @param table
   * @param connection
   */
  private insertTables = ({ tuple, connection, isThroughFinalQuery }) => {
    const promisifyQuery = promisify(connection.query).bind(connection);
    const logger = new Logger();

    const { tables, table_ids } = tuple;
    const tableNames = Object.keys(tables);

    tableNames.forEach((name, index) => {
      const count = tables[name];
      const tableValue = `('${name}', ${count})`;

      const insertQueryString = `
        insert into master.tables_statistic (table_name, call_count) 
        values ${tableValue} 
        on duplicate key update call_count = call_count + ${count};`;

      promisifyQuery(insertQueryString)
        .then(({ insertId }) => {
          table_ids.add(insertId);

          if (index === tableNames.length - 1) {
            this.saveQueryToTablesRelation({ connection, tuple, isThroughFinalQuery });
          }
        })
        .catch(insertTableError => {
          logger.logError(insertTableError);
          connection.rollback();
        });
    });
  };

  async save(connection) {
    const logger = new Logger();

    this.getAllFilteredQueries(connection)
      .then(queries => {
        if (!queries.length) {
          return;
        }

        const tuples = this.createQueriesTuple(queries);

        queries.forEach((query, index) => {
          const { query_text } = query;
          tuples[index].tables = countBy(
            this.parseTablesFromQuery({
              query_text,
              connection,
            })
          );
        });

        tuples.forEach((tuple, index) => {
          const isThroughFinalQuery = index === (tuples.length - 1);
          this.insertTables({ tuple, connection, isThroughFinalQuery });
        });
      })
      .catch(error => {
        logger.logError(error.message);
        connection.rollback();
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
