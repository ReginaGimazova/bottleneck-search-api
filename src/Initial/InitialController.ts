import { originalQueryController } from '../QueryLogImporting/OriginalQueryController';
import databasePrepare from "./DatabasePrepare";
import {checkTableInDatabase} from "./CheckTableInDatabase";

export class InitialController {
  async init() {
    const exist = await checkTableInDatabase.checkTable('original_queries');

    if (exist){
      databasePrepare.truncateTables(tablesTruncated => {
        if (tablesTruncated) {
          originalQueryController.save();
        }
      })
    } else {
      databasePrepare.createTables();
    }
  }
}

export const initialController = new InitialController();
