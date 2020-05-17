import * as fs from 'fs';
// tslint:disable-next-line:no-var-requires
require('dotenv').config()

import DBNameReplacer from './DBNameReplacer';
import DBConnection from '../DatabaseAccess/DBConnection';
import Logger from '../helpers/Logger';
import FilteredQueryDataStore from '../FilteredQueries/FilteredQueryDataStore';
import {analyzeProgress} from "../AnalyzeProgress/AnalyzeProgress";

const { LOG_PATH } = process.env;
const sql = fs.readFileSync(LOG_PATH).toString();

class OriginalQueryDataStore {
  save(): void {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const logger = new Logger();

    const filteredQueryDataStore = new FilteredQueryDataStore();

    const queryToSave = DBNameReplacer(sql);

    connection.beginTransaction((error) => {
      if (error) {
        logger.logError(error);
        throw error;
      }

      connection.query(queryToSave, async (err, result) => {
        if (err) {
          logger.logError(err + ' Query Log importing error ');
          connection.rollback();
        } else if (result) {
          analyzeProgress.queryLogInserted();
          await filteredQueryDataStore.save(connection);
        }
      });
    });
  }
}

export default OriginalQueryDataStore;
