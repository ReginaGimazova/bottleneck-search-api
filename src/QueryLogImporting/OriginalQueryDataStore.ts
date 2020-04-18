import * as fs from 'fs';
import DBNameReplacer from "./DBNameReplacer";
import DBConnection from "../helpers/DBConnection/DBConnection";
import Logger from "../helpers/Logger";
import SuitableQueryDataStore from "../SuitableQueries/SuitableQueryDataStore";

const sql = fs.readFileSync('/home/regina/Документы/test.sql').toString();

class OriginalQueryDataStore {
  save() : void {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    const suitableQueryDataStore = new SuitableQueryDataStore();

    const queryToSave = DBNameReplacer(sql);

    connection.query(queryToSave, err => {
      if (err){
        logger.setLevel('error');
        logger.logError(err + ' Query Log importing error ');
        connection.end();
      }
      else {
        suitableQueryDataStore.save(connection);
      }
    });
  };
}

export default OriginalQueryDataStore;