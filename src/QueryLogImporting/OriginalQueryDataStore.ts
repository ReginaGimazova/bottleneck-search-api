import * as fs from 'fs';
import DBNameReplacer from './DBNameReplacer';
import DBConnection from '../DatabaseAccess/DBConnection';
import Logger from '../helpers/Logger';
import FilteredQueryDataStore from '../FilteredQueries/FilteredQueryDataStore';

const sql = fs.readFileSync('/home/regina/Документы/test1.sql').toString();

class OriginalQueryDataStore {
  save(): void {
    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    const filteredQueryDataStore = new FilteredQueryDataStore();

    const queryToSave = DBNameReplacer(sql);

    connection.beginTransaction((error) => {
      if (error) {
        logger.logError(error);
        throw error;
      }

      connection.query(queryToSave, (err, result) => {
        if (err) {
          logger.logError(err + ' Query Log importing error ');
          connection.rollback();
        } else if (result) {
          console.log('original queries successfully saved')
          filteredQueryDataStore.save(connection);
        }
      });
    });
  }
}

export default OriginalQueryDataStore;
