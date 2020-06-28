import {logger} from '../helpers/Logger';

class RejectedQueryDataStore {

  /**
   *
   * @param connection - tool connection
   * @param errorText
   * @param rejectedQuery - query, which wasn't successfully processed at one of the step of analysis
   * @param type - a word that would be clear to describe the analysis stage at which the query wasn't successfully processed
   */
  save({ connection, errorText = '', rejectedQuery = '', type = '' }) {

    const insertQuery =
      `insert into master.rejected_original_queries (error_text, query_text, type)
       values ?`;

    const values = [[errorText, rejectedQuery, type]];

    connection.query(insertQuery, [values], error => {
      if (error) {
        logger.logError(error + ' Save rejected query failed ');
        connection.rollback();
      }
    });
  }
}

export const rejectedQueryDataStore = new RejectedQueryDataStore();
