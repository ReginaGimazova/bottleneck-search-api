import { promisify } from 'util';
import countBy from 'lodash/countBy';
import without from 'lodash/without';

import {rejectedQueryDataStore} from '../RejectedQueriesSaving/RejectedQueryDataStore';
import parseTablesUsedInQueries from './ParseTablesUsedInQueries';
import {logger} from '../helpers/Logger';
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
    const { error: parserError = '', tables = [] } = parseTablesUsedInQueries(
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
    const insertQuery = this.convertTupleToQueryString(tuples).join(', ');

    try {
      connection.query('SET FOREIGN_KEY_CHECKS = 0;');

      await promisifyQuery(
        `insert into master.queries_to_tables (query_id, table_id) values ${insertQuery}`
      );

      connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    } catch (queryTableError) {
      await analyzeProgress.resetCounter();
      logger.logError(queryTableError);
      connection.rollback();
    }
  }

  /**
   *
   * @param table
   * @param connection
   */
  private insertTablesSeparately = async ({
    tuple,
    connection,
    isThroughFinalQuery,
  }) => {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const { tables, table_ids } = tuple;
    const tableNames = Object.keys(tables);

    if (isThroughFinalQuery && !Object.entries(tables).length) {
      logger.logInfo('Tables saved')
      await analyzeProgress.updateProgress();
    }

    for (let index = 0; index < tableNames.length; index++) {
      const name = tableNames[index];
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
          return tuple;
        }
      } catch (insertTableError) {
        await analyzeProgress.resetCounter();
        logger.logError(insertTableError);
        connection.rollback();
      }
    }
  };

  /**
   *
   * @param connection
   * @param queries
   * @param callback
   */
  save({ connection, queries, callback }) {
    let tuples = this.createQueriesTuple(queries);

    queries.forEach((query, index) => {
      const { query_text } = query;
      const usedTables = this.parseTablesFromQuery({query_text, connection})

      if (usedTables.length === 0){
        tuples[index] = undefined
      }
      else {
        tuples[index].tables = countBy(usedTables);
      }
    });

    tuples = without(tuples, undefined);

    tuples.forEach(async (tuple, index) => {
      const isThroughFinalQuery = index === tuples.length - 1;

      tuples[index] = await this.insertTablesSeparately({
        tuple,
        connection,
        isThroughFinalQuery,
      });

      if (isThroughFinalQuery){
        await this.saveQueryToTablesRelation({connection, tuples});
        logger.logInfo('Tables saved')
        await analyzeProgress.updateProgress();
        return callback(true)
      }
    });
  }

  /**
   *
   * @param callback
   */
  getAll(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();

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
