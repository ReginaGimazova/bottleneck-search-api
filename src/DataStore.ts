import { createConnection } from 'mysql';
import * as fs from 'fs';
import originalQueries from './tableMappers/originalQueries';
import connectionConfig from './config/connectionConfig';

import { createInsertQuery } from './parser';

const sql = fs.readFileSync('/home/regagim/Рабочий стол/test.sql').toString();

export class DataStore {
  save() {
    const connection = createConnection({
      ...connectionConfig,
    });
    const queryToSave = createInsertQuery(
      originalQueries.table_name,
      originalQueries.database,
      sql
    );

    connection.query(queryToSave, err => {
      if (err) console.log('query to save ', err);
    });

    connection.end();
  }

  getSuitableQueries() {
    const connection = createConnection({
      ...connectionConfig,
    });

    let suitableOriginalQueries = [];
    connection.query(
      'insert into suitable_original_queries (queryText, userHost) select argument, userHost from original_queries where argument like "select%"',
      (result, error) => {
        console.log('get suitable query', error);
        suitableOriginalQueries = result;
      }
    );
  }
}
