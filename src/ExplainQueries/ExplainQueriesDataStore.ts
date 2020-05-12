import { promisify } from 'util';
import Logger from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import DBConnection from "../DatabaseAccess/DBConnection";
import {prodConnectionConfig} from "../DatabaseAccess/ConnectionConfig";

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
    return prodConnection.create(prodConnectionConfig)
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

  public getExplainInfo(){

  }
}

export default ExplainQueriesDataStore;
