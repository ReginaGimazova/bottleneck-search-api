import { Connection, MysqlError } from 'mysql';
import sha from 'sha1';
import {promisify} from "util";

import RejectedQueryDataStore from '../RejectedQueriesSaving/RejectedQueryDataStore';
import queryParametrizer from './queryParametrizer';
import Logger from '../helpers/Logger';
import DBConnection from '../DatabaseAccess/DBConnection';

class ParametrizedQueriesDataStore {
  private static parametrizeQuery({ argument, connection }) {
    const rejectedQueryDataStore = new RejectedQueryDataStore();
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
    const valuesTuple = `("${query}", "${hash}", "${user_host}", 1)`;

    const insertQuery = `
        insert into master.parametrized_queries (parsed_query, parsed_query_hash, user_host, query_count) 
        values ${valuesTuple} 
        on duplicate key 
        update query_count = query_count + 1`;

    return promisifyQuery(insertQuery);
  }

  getAll({ tables, byHost, callback }) {
    const tablesToString =
      tables.length > 0 ? tables.map(table => `"${table}"`).join(', ') : '';

    const groupBySqlQueryString =
      `select id, parsed_query, SUM(query_count) as query_count from master.parametrized_queries 
       group by parsed_query_hash order by query_count desc;`;

    const groupBySqlAndHostQueryString =
      'select id, parsed_query, query_count from master.parametrized_queries order by query_count desc;';

    const groupBySqlWithTables =
      `select parametrized_queries.id, parsed_query, query_count from 
       ( select id from tables_statistic where table_name in (${tablesToString})) as tables
       inner join queries_to_tables on table_id = tables.id
       inner join filtered_queries on queries_to_tables.query_id = filtered_queries.id
       inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id 
       group by parsed_query_hash order by sum(query_count) desc;`;

    const groupBySqlAndHostWithTables =
      `select parametrized_queries.id, parsed_query, query_count from 
       ( select id from tables_statistic where table_name in (${tablesToString})) as tables 
       inner join queries_to_tables on table_id = tables.id 
       inner join filtered_queries on queries_to_tables.query_id = filtered_queries.id 
       inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id 
       order by query_count desc;`;

    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

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
