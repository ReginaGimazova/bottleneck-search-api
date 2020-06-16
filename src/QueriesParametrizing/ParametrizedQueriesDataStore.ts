import { MysqlError } from 'mysql';
import sha from 'sha1';
import { promisify } from 'util';

import { rejectedQueryDataStore } from '../RejectedQueriesSaving/RejectedQueryDataStore';
import queryParametrizer from './queryParametrizer';
import { logger } from '../helpers/Logger';
import DBConnection from '../DatabaseAccess/DBConnection';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';

class ParametrizedQueriesDataStore {
  private parametrizeQuery({ argument, connection }) {
    const { query = '', error: parametrizeError = '' } = queryParametrizer(
      argument
    );

    if (parametrizeError) {
      rejectedQueryDataStore.save({
        connection,
        errorText: parametrizeError,
        rejectedQuery: argument,
        type: 'PARSER',
      });
      return '';
    } else if (query) {
      return query;
    }
  }

  /**
   *
   * @param connection
   * @param tuple
   */
  async save(connection, tuple) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const { argument } = tuple;
    const query = this.parametrizeQuery({
      argument,
      connection,
    });

    if (!query) {
      return undefined;
    }

    const hash = sha(query);

    const insertQuery = `
      insert into master.parametrized_queries (parsed_query, parsed_query_hash) 
      values ("${query}", "${hash}")
    `;

    try {
      const result = await promisifyQuery(insertQuery);
      if (result.insertId) {
        return result.insertId;
      }
    } catch (e) {
      logger.logError(e);
    }
  }

  /**
   *
   * @param connection
   * @param argument
   */
  private async returnIdOrInsert({ connection, tuple }) {
    const hash = sha(tuple.argument);

    const selectString = `
      select id from master.parametrized_queries
      where parsed_query_hash = "${hash}"
    `;

    const promisifyQuery = promisify(connection.query).bind(connection);

    try {
      const result = await promisifyQuery(selectString);
      if (result.length !== 0) {
        return result[0].id;
      }
    } catch (e) {
      logger.logError(e);
      connection.rollback();
    }
  }

  /**
   *
   * @param connection - connection to tool database
   * @param tuples - created tuples from filtered queries
   * @param callback - return updated tuples with parametrized_queries_id for each tuple
   * (if an error occurred during parsing using the 'node-sql-parser' library,
   * then such tuple cancelled (= undefined))
   *
   * Callback from save method return updated query tuples with parametrized_query_id
   */

  public async getParametrizedQueries({ connection, tuples }) {
    for (let index = 0; index < tuples.length; index++) {
      let id;
      const tuple = tuples[index];

      id = await this.returnIdOrInsert({
        connection,
        tuple,
      });

      if (!id) {
        id = await this.save(connection, tuple);
      }

      tuple.parametrized_query_id = id;
      const correctTuples = tuples.filter(value => value);

      if (index === tuples.length - 1) {
        analyzeProgress.parametrizedQueriesInserted();
        return correctTuples;
      }
    }
  }

  getAll({ tables, byHost, callback }) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();

    const searchTables =
      tables.length > 0 ? tables.map(table => `"${table}"`).join(', ') : '';

    const tablesJoinPart = `
      inner join filtered_queries on parametrized_queries.id = filtered_queries.parametrized_query_id
      inner join queries_to_tables on filtered_queries.id = queries_to_tables.query_id
      inner join tables_statistic
        on queries_to_tables.table_id = tables_statistic.id
        and json_search(json_array(${searchTables}), 'all', table_name) > 0
    `;

    const groupBySql = `select id, parsed_query from master.parametrized_queries 
       ${tables.length > 0 ? tablesJoinPart : ''}
      `;

    const groupBySqlAndHost = `
      select parametrized_queries.id, parsed_query
      from master.parametrized_queries
      inner join master.queries_to_user_host on parametrized_queries.id = queries_to_user_host.parametrized_query_id
      inner join master.user_host on queries_to_user_host.user_host_id = user_host.id
      ${tables.length > 0 ? tablesJoinPart : ''}
      group by parsed_query_hash;`;

    const queryString = byHost ? groupBySqlAndHost : groupBySql;

    connection.query(queryString, (err: MysqlError, result: any) => {
      if (result) {
        callback(result, undefined);
      }
      if (err) {
        logger.logError(err);
        callback(undefined, err);
      }
    });

    connection.end();
  }
}

export default ParametrizedQueriesDataStore;
