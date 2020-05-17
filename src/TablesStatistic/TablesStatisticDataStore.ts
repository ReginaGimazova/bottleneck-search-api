import { promisify } from 'util';
import countBy from 'lodash/countBy';

import RejectedQueryDataStore from '../RejectedQueriesSaving/RejectedQueryDataStore';
import usedTablesReceiver from './UsedTablesReceiver';
import Logger from '../helpers/Logger';
import DBConnection from '../DatabaseAccess/DBConnection';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';

class TablesStatisticDataStore {
  /**
   *
   * @param queriesArray
   */
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
   * @param tuples
   *
   * This function takes tuple as argument and returns ready for insert query string
   * table_ids, query_id - tuple fields
   */

  private convertTupleToQueryString(tuples) {
    return tuples.map(({table_ids, query_id}) =>
      [...table_ids]
        .map(tableId => `('${query_id}', '${tableId}')`)
        .join(', ')
    )
  }

  /**
   *
   * @param query_text
   * @param connection
   */
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

  /**
   *
   * @param connection
   * @param tuples
   */
  private async saveQueryToTablesRelation({
    connection,
    tuples,
  }) {
    const promisifyQuery = promisify(connection.query).bind(connection);
    const logger = new Logger();

    const insertQuery = this.convertTupleToQueryString(tuples).join(', ');

    try {
      connection.query('SET FOREIGN_KEY_CHECKS = 0;');

      await promisifyQuery(
        `insert into master.queries_to_tables (query_id, table_id) VALUES ${insertQuery}`
      );

      connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    } catch (queryTableError) {
      logger.logError(queryTableError);
      connection.rollback();
    }
  }

  /**
   *
   * @param table
   * @param connection
   */
  private insertTablesSeparately = ({
    tuple,
    connection,
    isThroughFinalQuery,
    callbackTuple,
  }) => {
    const promisifyQuery = promisify(connection.query).bind(connection);
    const logger = new Logger();

    const { tables, table_ids } = tuple;
    const tableNames = Object.keys(tables);

    if (isThroughFinalQuery && !Object.entries(tables).length) {
      analyzeProgress.tablesInserted();
    }

    tableNames.forEach(async (name, index) => {
      const count = tables[name];
      const tableValue = `('${name}', ${count})`;

      const insertQueryString = `
        insert into master.tables_statistic (table_name, call_count) 
        values ${tableValue} 
        on duplicate key update call_count = call_count + ${count};`;

      try {
        const { insertId } = await promisifyQuery(insertQueryString);
        table_ids.add(insertId);

        if (index === tableNames.length - 1) {
          callbackTuple(tuple);
        }
      } catch (insertTableError) {
        logger.logError(insertTableError);
        connection.rollback();
      }
    });
  };

  /**
   *
   * @param connection
   * @param queries
   * @param callback
   */
  save({ connection, queries, callback }) {
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
      const isThroughFinalQuery = index === tuples.length - 1;

      this.insertTablesSeparately({
        tuple,
        connection,
        isThroughFinalQuery,
        callbackTuple: async updatedTuple => {
          tuples[index] = updatedTuple;
          if (isThroughFinalQuery){
            await this.saveQueryToTablesRelation({connection, tuples});
            callback(true)
          }
        },
      });
    });
  }

  /**
   *
   * @param callback
   */
  getAll(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
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
