import { Connection, MysqlError } from 'mysql';
import sha from 'sha1';
import { promisify } from 'util';

import {rejectedQueryDataStore} from '../RejectedQueriesSaving/RejectedQueryDataStore';
import queryParametrizer from './queryParametrizer';
import {logger} from '../helpers/Logger';
import DBConnection from '../DatabaseAccess/DBConnection';
import {analyzeProgress} from "../AnalyzeProgress/AnalyzeProgress";

class ParametrizedQueriesDataStore {
  private static parametrizeQuery({ argument, connection }) {
    const {query = '', error: parametrizeError = ''} = queryParametrizer(
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

  save(connection: Connection, tuple) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const { argument } = tuple;
    const query = ParametrizedQueriesDataStore.parametrizeQuery({
      argument,
      connection,
    });

    if (!query) {
      return undefined;
    }

    const hash = sha(query);
    const valuesTuple = `("${query}", "${hash}", 1)`;

    const insertQuery = `
        insert into master.parametrized_queries (parsed_query, parsed_query_hash, query_count) 
        values ${valuesTuple} 
        on duplicate key 
        update query_count = query_count + 1`;

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
          tuples[index].parametrized_query_id = insertId;
        }

        const correctTuples = tuples.filter(t => t);

        if (!correctTuples.find(t => !t.parametrized_query_id)) {
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

    const groupBySql =
      `select id, parsed_query, query_count from master.parametrized_queries 
       ${tables.length > 0 ? tablesJoinPart : ''}
       order by query_count desc;`;

    const groupBySqlAndHost = `
      select parametrized_queries.id, parsed_query, query_count
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
