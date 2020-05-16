import { promisify } from 'util';
import { MysqlError } from 'mysql';

import Logger from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import DBConnection from "../DatabaseAccess/DBConnection";

class ExplainQueriesDataStore {
  private convertQueriesToTuple(queries) {
    return queries.map(({ id, query_text }) => {
      return {
        id,
        query_text,
        explain: undefined,
      };
    });
  }

  private prepareInsertValues = (tuples) => tuples.map(({ id, explain }) => [`${id}`, `${explain}`]);

  private prodDbConnection(){
    const prodConnection = new DBConnection();
    return prodConnection.createProdConnection();
  }

  private analyzeQueries({ tuples, callback }) {
    const logger = new Logger();
    const connection = this.prodDbConnection();

    const promisifyQuery = promisify(connection.query).bind(connection);

    tuples.forEach(async ({ query_text }, index) => {
      const queryString = `explain ${query_text};`;

      try {
        const analyzeResult = await promisifyQuery(queryString);
        tuples[index].explain = JSON.stringify(analyzeResult[0]);

        if (index === tuples.length - 1) {
          callback(tuples);
        }
      } catch (e) {
        connection.rollback();
        logger.logError(e.message);
      }
    });
  }

  public save({ connection, queries }) {
    const logger = new Logger();
    const tuples = this.convertQueriesToTuple(queries);

    const promisifyQuery = promisify(connection.query).bind(connection);

    this.analyzeQueries({
      tuples,
      callback: updatedTuples => {
        const values = this.prepareInsertValues(updatedTuples);
        const queryString =
          `insert into master.explain_replay_info
          (query_id, explain_result) values ?`;

        promisifyQuery(queryString, [values])
          .then(() => {
            analyzeProgress.updateProgress(100);
            connection.commit();
          })
          .catch(insertError => {
            logger.logError(insertError.message);
            connection.rollback();
          });
      },
    });
  }

  public getExplainInfo(tables, callback){
    const tablesToString =
      tables.length > 0 ? tables.map(table => `"${table}"`).join(', ') : '';

    const explainResult = `
      select value as critical_statuses, parametrized_queries.query_count, parametrized_queries.parsed_query
      from master.statuses_configuration
      inner join explain_replay_info as explain_info on 
        JSON_UNQUOTE(JSON_EXTRACT(explain_info.explain_result, '$.Extra')) = value
      inner join filtered_queries on explain_info.query_id = filtered_queries.id
      inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
      where status = true and type = 'EXPLAIN';
    `;

    const explainResultWithTables = `
      select value as critical_statuses, parametrized_queries.query_count, parametrized_queries.parsed_query
      from master.statuses_configuration
      inner join explain_replay_info as explain_info on 
        JSON_UNQUOTE(JSON_EXTRACT(explain_info.explain_result, '$.Extra')) = value
      inner join filtered_queries on explain_info.query_id = filtered_queries.id
      inner join queries_to_tables on filtered_queries.id = queries_to_tables.query_id
      inner join tables_statistic on queries_to_tables.table_id = tables_statistic.id and table_name in (${tablesToString})
      inner join parametrized_queries on filtered_queries.parametrized_query_id = parametrized_queries.id
      where status = true and type = 'EXPLAIN';
    `;

    let query = explainResult;

    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const logger = new Logger();

    if (tables.length > 0){
      query = explainResultWithTables;
    }

    connection.query(query, (err: MysqlError, result: any) => {
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

export default ExplainQueriesDataStore;
