import { promisify } from 'util';

import {logger} from '../helpers/Logger';
import { rejectedQueryDataStore } from '../RejectedQueriesSaving/RejectedQueryDataStore';

class AnalyzeCommandBaseDataStore {
  /**
   *
   * @param queries - filtered queries
   *
   * method used for create
   *    (id = filtered_query_id, query_text = filtered_query_text,
   *    result = analyze command (explain or profile) info )
   * tuples from queries.
   */

  protected convertQueriesToTuple(queries) {
    return queries.map(({ id, query_text }) => ({
      id,
      query_text,
      result: undefined,
    }));
  }

  protected async runAnalyzeInstruction() {
    const queryString = '';

  }
  /**
   *
   * @param tuples - tuples, created in convertQueriesToTuple method (result = undefined)
   * @param prodConnection - connection to production database, which contains original info
   * @param connection - connection to tool database
   * @param callback - return updated tuples with result = EXPLAIN output
   */
  private analyzeQueries({ tuples, prodConnection, connection, callback }) {
    const promisifyQuery = promisify(prodConnection.query).bind(prodConnection);

    tuples.forEach(async ({ query_text }, index) => {
      const queryString = `explain ${query_text};`;

      try {
        const analyzeResult = await promisifyQuery(queryString);
        tuples[index].result = JSON.stringify(analyzeResult[0]);

        if (index === tuples.length - 1) {
          callback(tuples);
        }
      } catch (e) {
        rejectedQueryDataStore.save({
          connection,
          type: 'EXPLAIN',
          rejectedQuery: query_text,
          errorText: e.message,
        });
        logger.logError(e.message);
      }
    });
  }

}

export default AnalyzeCommandBaseDataStore;
