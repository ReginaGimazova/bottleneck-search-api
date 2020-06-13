import {logger} from '../helpers/Logger';

// TODO: maybe better to create singleton
class RejectedQueryDataStore {
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
