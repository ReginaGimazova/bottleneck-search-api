import { Connection } from 'mysql';

import rejectSourceTypes from '../config/constants';
import RejectedQueryDataStore from '../RejectedQueriesSaving/RejectedQueryDataStore';
import queryParametrizer from './queryParametrizer';
import Logger from "../Logger";

class ParametrizedQueriesDataStore {
  save(connection: Connection) {
    let commaSeparatedParametrizedQueries = '';
    const rejectedQueryDataStore = new RejectedQueryDataStore();
    const logger = new Logger();

    connection.query(
      'select query_text, id from master.suitable_original_queries;',
      (error, queries) => {
        if (queries) {
          const parametrizedQueries = [];

          queries.forEach(originalQuery => {
            const {
              query = '',
              error: parametrizeError = '',
            } = queryParametrizer(originalQuery.query_text);
            if (parametrizeError) {
              rejectedQueryDataStore.save({
                connection,
                errorText: parametrizeError,
                rejectedQuery: originalQuery.query_text,
                type: rejectSourceTypes.PARSER,
              });
            } else {
              parametrizedQueries.push(`('${query}', 'sha(${query})', 1)`);
              commaSeparatedParametrizedQueries = parametrizedQueries.join(
                ', '
              );
            }
          });
        }
        if (error){
          logger.setLevel('error');
          logger.logError(error);
        }
      }
    );

    if (commaSeparatedParametrizedQueries) {
      connection.query(
        `insert into master.parametrized_queries (parsed_query, parsed_query_hash, query_count)
           values (${commaSeparatedParametrizedQueries}) 
           on duplicate key update query_count = query_count + 1`,
        (err) => {
          if (err){
            logger.setLevel('error');
            logger.logError(err);
          }
        }
      );
    }
  }
}

export default ParametrizedQueriesDataStore;
