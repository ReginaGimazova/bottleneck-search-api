import * as fs from 'fs';
import DBNameReplacer from "./DBNameReplacer";
import DBConnection from "../DBConnection/DBConnection";
import Logger from "../Logger";

const sql = fs.readFileSync('/home/regina/Документы/test.sql').toString();

class OriginalQueryDataStore {
  save() : void {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    const queryToSave = DBNameReplacer(sql);

    connection.query(queryToSave, err => {
      if (err){
        logger.setLevel('error');
        logger.logError(err + ' Query Log importing error ');
      }
    });

    connection.end();
  };
}

export default OriginalQueryDataStore;