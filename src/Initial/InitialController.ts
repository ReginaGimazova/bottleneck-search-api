import { originalQueryController } from '../QueryLogImporting/OriginalQueryController';
import databasePrepare from "./DatabasePrepare";
import {checkTableInDatabase} from "../helpers/CheckTableInDatabase";

export class InitialController {
  init() {
    checkTableInDatabase.checkTable({
      tableName: 'original_queries',
      callbackCheckTable: exist => {
        if (exist){
          originalQueryController.save();
        } else {
          databasePrepare.createTables();
        }
      },
    });
  }
}

export const initialController = new InitialController();
