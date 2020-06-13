import * as fs from 'fs';
// tslint:disable-next-line:no-var-requires
require('dotenv').config()

import DBNameReplacer from './DBNameReplacer';
import DBConnection from '../DatabaseAccess/DBConnection';
import {logger} from '../helpers/Logger';
import FilteredQueryDataStore from '../FilteredQueries/FilteredQueryDataStore';
import {analyzeProgress} from "../AnalyzeProgress/AnalyzeProgress";

const { LOG_PATH } = process.env;
const sql = fs.readFileSync(LOG_PATH).toString();

class OriginalQueryDataStore {
  save(): void {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();

    const filteredQueryDataStore = new FilteredQueryDataStore();

    const queryToSave = DBNameReplacer(sql);

    connection.beginTransaction((error) => {
      if (error) {
        logger.logError(error);
      }

      connection.query(queryToSave, async (err, result) => {
        if (err) {
          logger.logError('Query Log importing error: ' + err);
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
