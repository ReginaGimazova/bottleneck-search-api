/**
 * This class used for update progress on query log analyze for show progress bar on frontend app view
 */
import DBConnection from "../DatabaseAccess/DBConnection";
import {promisify} from "util";
import {logger} from "../helpers/Logger";

class AnalyzeProgress {
  private analyzeStepsCount = 8;

  public async updateProgress(){
    const connection = new DBConnection().createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);
    const currentProgress = await this.getCurrentProgress(connection);

    try {
      let correctProgress;
      if (currentProgress){
        correctProgress = 100 / this.analyzeStepsCount + currentProgress[0].progress;
      }

      const updateQueryString = `
        update master.application_info set progress = ${correctProgress};
      `;

      await promisifyQuery(updateQueryString);
      connection.end();

      return correctProgress;
    } catch (e) {
      connection.end();
      logger.logError(e);

      return 0;
    }
  }

  public async getCurrentProgress(connection){
    let toolConnection = connection;
    let result;

    if (!connection){
      toolConnection = new DBConnection().createToolConnection();
    }

    const promisifyQuery = promisify(toolConnection.query).bind(toolConnection);

    const queryString = `
      select progress from master.application_info;
    `;

    try {
      result = await promisifyQuery(queryString);
    } catch (e) {
      logger.logError(e)
    }

    if (!connection){
      toolConnection.end();
    }

    return result;
  }

  public async resetCounter(){
    const connection = new DBConnection().createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);

    const queryString = `
      update master.application_info set progress = 0;
    `;

    await promisifyQuery(queryString);
  }
}

export const analyzeProgress = new AnalyzeProgress();