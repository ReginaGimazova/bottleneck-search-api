import {createConnection} from 'mysql';
import * as fs from 'fs';

import {createInsertQuery} from './parser';

const sql = fs.readFileSync('/home/regagim/Рабочий стол/test.sql').toString();

export class DataStore {
  save () {
    const connection = createConnection({
      multipleStatements: true,
      host: "localhost",
      user: "root",
      password: "34Zc18WfLn",
      database: "test"
    });
    const queryToSave = createInsertQuery('original_queries', 'test',  sql);

    connection.query(queryToSave, (err, result) => {
      if (err) console.log(err);
      console.log("1 record inserted");
    });

    connection.end();
  }
}
