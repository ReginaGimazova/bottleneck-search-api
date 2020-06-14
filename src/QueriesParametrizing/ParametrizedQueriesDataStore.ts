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

  private clearTuples = (tuples) => {
    const correctTuples = tuples
      .filter(tuple => tuple)

    for (const tuple1 of correctTuples){
      for (const tuple2 of correctTuples){
        if (tuple1.parametrized_query_hash === tuples.parametrized_query_hash){
          tuple1.parametrized_query_id = tuple1.parametrized_query_id || tuple2.parametrized_query_id;
          tuple2.parametrized_query_id = tuple2.parametrized_query_id || tuple1.parametrized_query_id;
        }
      }
    }

    return correctTuples;
  };

  /*/!**
   *
   * @param connection
   * @param argument
   * @param callbackResult
   *!/
  private checkParamQueryExist({ connection, argument, callbackResult }) {
    const hash = sha(argument);

    const selectString = `
      select id from master.parametrized_queries
      where parsed_query_hash = "${hash}"
    `;

    const promisifyQuery = promisify(connection.query).bind(connection);

    promisifyQuery(selectString)
      .then(result => {
        if (result.length > 0) {
          callbackResult(result[0].id);
        } else {
          callbackResult(undefined);
        }
      })
      .catch(e => {
        logger.logError(e);
        connection.rollback();
      });

  }
*/
  /**
   *
   * @param connection
   * @param tuple
   */
  save(connection, tuple) {
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
      on duplicate key update parsed_query=parsed_query
    `;

    return promisifyQuery(insertQuery);
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

  public getParametrizedQueries({ connection, tuples, callback }) {
    tuples.forEach(async (tuple, index) => {
      try {
        const parametrizedQueryResult = await this.save(
          connection,
          tuple
        );

        if (!parametrizedQueryResult) {
          tuples[index] = undefined;
        } else {
          const { insertId } = parametrizedQueryResult;
          const hash = sha(tuple.argument);

          tuples[index].parametrized_query_id = insertId;
          tuples[index].parsed_query_hash = hash
        }

        const correctTuples = this.clearTuples(tuples);

        if (index === tuples.length - 1) {
          analyzeProgress.parametrizedQueriesInserted();
          callback(correctTuples);
        }
      } catch (error) {
        logger.logError(error);
        connection.rollback();
      }
    });
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
