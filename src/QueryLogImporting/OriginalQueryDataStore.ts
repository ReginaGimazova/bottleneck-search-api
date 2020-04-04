import * as fs from 'fs';
import DBNameReplacer from "./DBNameReplacer";
import DBConnection from "../DBConnection/DBConnection";

const sql = fs.readFileSync('/home/regina/Документы/test.sql').toString();

class OriginalQueryDataStore {
  save() : void {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();

    const queryToSave = DBNameReplacer(sql);

    connection.query(queryToSave, err => {
      if (err) console.log('query to save ', err);
    });

    connection.end();
  };
}

export default OriginalQueryDataStore;