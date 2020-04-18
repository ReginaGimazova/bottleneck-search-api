import Logger from '../helpers/Logger';

class RejectedQueryDataStore {
  save({ connection, errorText = '', rejectedQuery = '', type = '' }) {
    const logger = new Logger();

    connection.query(
      `insert into master.rejected_original_queries (error_text, query_text, type)
       values ('${errorText}', '${rejectedQuery}', '${type}')`,

      error => {
        if (error) {
          logger.setLevel('error');
          logger.logError(error + ' Save rejected route failed ');
        }
      }
    );
  }
}

export default RejectedQueryDataStore;
