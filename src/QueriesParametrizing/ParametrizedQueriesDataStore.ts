import { Connection, MysqlError } from 'mysql';
import sha from 'sha1';

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

  save(connection: Connection, tuple, callback) {
    const logger = new Logger();

    const { argument, user_host } = tuple;
    const query = ParametrizedQueriesDataStore.parametrizeQuery({
      argument,
      connection,
    });

    if (!query) {
      return;
    }

    const hash = sha(query);
    const valuesTuple = `("${query}", "${hash}", "${user_host}", 1)`;

    const insertQuery = `
        insert into master.parametrized_queries (parsed_query, parsed_query_hash, user_host, query_count) 
        values ${valuesTuple} 
        on duplicate key 
        update query_count = query_count + 1`;

    connection.query(insertQuery, (err, result) => {
      if (result && result.insertId) {
        tuple.parametrized_query_id = result.insertId;
        callback(result.insertId);
      } else if (err) {
        logger.logError(err);
        connection.rollback();
      }
    });
  }

  getAllGroupBySql(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    connection.query(
      'select id, parsed_query, SUM(query_count) as query_count ' +
        'from master.parametrized_queries ' +
        'group by parsed_query_hash;',

      (err: MysqlError, result: any) => {
        if (result) {
          callback(result, undefined);
        }
        if (err) {
          logger.logError(err);
          callback(undefined, err);
        }
      }
    );

    connection.end();
  }

  getAllGroupBySqlAndHost(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    connection.query(
      'select id, parsed_query, query_count ' +
        'from master.parametrized_queries ' +
        'order by query_count desc;',

      (err: MysqlError, result: any) => {
        if (result) {
          callback(result, undefined);
        }
        if (err) {
          logger.logError(err);
          callback(undefined, err);
        }
      }
    );

    connection.end();
  }
}

export default ParametrizedQueriesDataStore;
