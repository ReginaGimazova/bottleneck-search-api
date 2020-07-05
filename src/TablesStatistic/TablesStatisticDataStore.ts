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
   * @param filteredQueriesArray
   */
  private createQueriesTuple(filteredQueriesArray) {
    return filteredQueriesArray.map(item => {
      return {
        query_id: item.id,
        table_ids: new Set(),
        tables: [],
      };
    });
  }

  /**
   *
   * @param filteredQueriesTuples
   *
   * @summary This function takes filtered queries tuples as argument and returns ready for insert query string
   * @inner table_ids, query_id - tuple fields
   */

  private convertTupleToQueryString(filteredQueriesTuples) {
    return filteredQueriesTuples.map(({table_ids, query_id}) =>
      [...table_ids]
        .map(tableId => `('${query_id}', '${tableId}')`)
        .join(', ')
    )
  }

  /**
   *
   * @param query_text - filtered query text
   * @param connection - tool connection
   *
   * @summary Returns all table names from query
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
   * @param connection - tool connection
   * @param filteredQueriesTuples - filtered queries tuples, created in createQueriesTuple function
   *
   * @summary This function save query to tables (many to many) relation
   */
  private async saveQueryToTablesRelation({
    connection,
    filteredQueriesTuples,
  }) {
    const promisifyQuery = promisify(connection.query).bind(connection);
    const insertQuery = this.convertTupleToQueryString(filteredQueriesTuples).join(', ');

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
   * @param connection - tool connection
   * @param filteredQueryTuple - object, containing tables, table_ids, query_id fields
   * @param isThroughFinalQuery - boolean value, if this value = true, progress should been updated
   *
   * @summary Save all tables for ONE query
   */
  private insertTablesSeparately = async ({
    filteredQueryTuple,
    connection,
    isThroughFinalQuery,
  }) => {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const { tables, table_ids } = filteredQueryTuple;
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
          return filteredQueryTuple;
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
   * @param connection - tool connection
   * @param queries - filtered queries array
   * @param callback - function from FilteredQueriesDataStore
   */
  save({ connection, queries, callback }) {
    let filteredQueriesTuples = this.createQueriesTuple(queries);

    queries.forEach((query, index) => {
      const { query_text } = query;
      const usedTables = this.parseTablesFromQuery({query_text, connection})

      if (usedTables.length === 0){
        filteredQueriesTuples[index] = undefined
      }
      else {
        filteredQueriesTuples[index].tables = countBy(usedTables);
      }
    });

    filteredQueriesTuples = without(filteredQueriesTuples, undefined);

    filteredQueriesTuples.forEach(async (filteredQueryTuple, index) => {
      const isThroughFinalQuery = index === filteredQueriesTuples.length - 1;

      filteredQueriesTuples[index] = await this.insertTablesSeparately({
        filteredQueryTuple,
        connection,
        isThroughFinalQuery,
      });

      if (isThroughFinalQuery){
        await this.saveQueryToTablesRelation({connection, filteredQueriesTuples});
        logger.logInfo('Tables saved')
        await analyzeProgress.updateProgress();
        return callback(true)
      }
    });
  }

  /**
   *
   * @param callback - function returns data and error to controller
   *
   * @summary Get all tables
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
        } else if (result) {
          callback(result, undefined);
        }
        connection.end();
      }
    );
  }
}

export default TablesStatisticDataStore;
