import { Connection, MysqlError } from 'mysql';
import sha from 'sha1';
import { promisify } from 'util';

import {rejectedQueryDataStore} from '../RejectedQueriesSaving/RejectedQueryDataStore';
import queryParametrizer from './queryParametrizer';
import {logger} from '../helpers/Logger';
import DBConnection from '../DatabaseAccess/DBConnection';

class ParametrizedQueriesDataStore {
  private static parametrizeQuery({ argument, connection }) {
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

  save(connection: Connection, tuple) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const { argument, user_host } = tuple;
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

  getAll({ tables, byHost, callback }) {
    const tablesToString =
      tables.length > 0 ? tables.map(table => `"${table}"`).join(', ') : '';

    const groupBySqlQueryString =
      `select id, parsed_query, query_count from master.parametrized_queries 
       order by query_count desc;`;

    // TODO: change with join to user host
    const groupBySqlAndHostQueryString =
      'select id, parsed_query, query_count from master.parametrized_queries order by query_count desc;';

    const groupBySqlWithTables = `
      select parametrized_queries.id, parametrized_queries.parsed_query, parametrized_queries.query_count as query_count
      from master.parametrized_queries
      inner join filtered_queries on parametrized_queries.id = filtered_queries.parametrized_query_id
      inner join queries_to_tables on filtered_queries.id = queries_to_tables.query_id
      inner join tables_statistic on queries_to_tables.table_id = tables_statistic.id where
      json_search (json_array(${tablesToString}), 'one', tables_statistic.table_name ) > 0
      group by parsed_query_hash;
    `;

    // TODO: change with join to user host
    const groupBySqlAndHostWithTables = `
      select parametrized_queries.id, parsed_query, count(parametrized_queries.id) as query_count
      from master.parametrized_queries
      inner join filtered_queries fq on parametrized_queries.id = fq.parametrized_query_id
      inner join queries_to_tables qtt on fq.id = qtt.query_id
      inner join tables_statistic ts on qtt.table_id = ts.id and find_in_set (table_name, "${tables.join(', ')}") > 0
      group by  parsed_query_hash
      order by query_count desc;`;

    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();

    let queryString = groupBySqlQueryString;
    const searchQueriesWithTables = !!tables.length;

    if (byHost && !searchQueriesWithTables) {
      queryString = groupBySqlAndHostQueryString;
    } else if (byHost && searchQueriesWithTables) {
      queryString = groupBySqlAndHostWithTables;
    } else if (!byHost && searchQueriesWithTables) {
      queryString = groupBySqlWithTables;
    }

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
