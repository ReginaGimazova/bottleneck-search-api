class RejectedQueryDataStore {
  save({ connection, errorText = '', rejectedQuery = '', type = '' }) {
    connection.query(
      `insert into master.rejected_original_queries (error_text, query_text, type)
       values ('${errorText}', '${rejectedQuery}', '${type}')`,

      (error) => {
        console.log(error);
      }
    );
  }
}

export default RejectedQueryDataStore;
