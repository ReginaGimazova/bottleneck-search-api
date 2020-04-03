import { createConnection } from 'mysql';
import * as fs from 'fs';
import originalQueries from './originalQueries';
import DBNameReplacer from "./DBNameReplacer";
import connectionConfig from "../config/connectionConfig";

const sql = fs.readFileSync('/home/regina/Документы/test.sql').toString();

class OriginalQueryDataStore {
  save() : void {
    const connection = createConnection({
      ...connectionConfig,
    });

    const queryToSave = DBNameReplacer(
      originalQueries.table_name,
      originalQueries.database,
      sql
    );

    connection.query(queryToSave, err => {
      if (err) console.log('query to save ', err);
    });

    connection.end();
  };
}

export default OriginalQueryDataStore;