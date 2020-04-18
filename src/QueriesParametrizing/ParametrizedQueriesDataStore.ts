import { Connection, MysqlError } from 'mysql';
import sha from 'sha1';

import rejectSourceTypes from '../helpers/config/constants';
import RejectedQueryDataStore from '../RejectedQueriesSaving/RejectedQueryDataStore';
import queryParametrizer from './queryParametrizer';
import Logger from '../helpers/Logger';
import DBConnection from "../helpers/DBConnection/DBConnection";

class ParametrizedQueriesDataStore {
  save(connection: Connection) {
    const rejectedQueryDataStore = new RejectedQueryDataStore();
    const logger = new Logger();
    const parametrizedQueries = [];

    connection.query(
      'select query_text, id from master.suitable_original_queries;',
      (error, queries) => {
        if (queries) {
          queries.forEach(({ query_text }) => {
            const {
              query = '',
              error: parametrizeError = '',
            } = queryParametrizer(query_text);
            if (parametrizeError) {
              rejectedQueryDataStore.save({
                connection,
                errorText: parametrizeError,
                rejectedQuery: query_text,
                type: rejectSourceTypes.PARSER,
              });
            } else if (!parametrizeError && query) {
              const hash = sha(query);
              const valuesTuple = `("${query}", "${hash}", 1)`;
              parametrizedQueries.push(valuesTuple);
            }
          });
        }

        if (parametrizedQueries.length > 0) {
          const commaSeparatedParametrizedQueries = parametrizedQueries.join(
            ', '
          );

          const insertQuery = `insert into master.parametrized_queries (parsed_query, parsed_query_hash, query_count) values ${commaSeparatedParametrizedQueries} on duplicate key update query_count = query_count + 1`;

          connection.query(insertQuery, err => {
            if (err) {
              console.log(err);
              logger.setLevel('error');
              logger.logError(err);
            }
          });
        }
        if (error) {
          logger.setLevel('error');
          logger.logError(error);
        }
      }
    );
  }

  getAll(callback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    connection.query('', (err: MysqlError, result: any) => {
      if (result) {
        callback(result, undefined);
      }
      if (err) {
        logger.setLevel('error');
        logger.logError(err);
        callback(undefined, err);
      }
    });
    connection.end();
  }
}

export default ParametrizedQueriesDataStore;
