import Logger from "../Logger";

class RejectedQueryDataStore {
  save({ connection, errorText = '', rejectedQuery = '', type = '' }) {
    const logger = new Logger();

    connection.query(
      `insert into master.rejected_original_queries (error_text, query_text, type)
       values ('${errorText}', '${rejectedQuery}', '${type}')`,

      (error) => {
        logger.setLevel('error');
        logger.logger(error + ' Save rejected queries failed ');
      }
    );
  }
}

export default RejectedQueryDataStore;
