import { promisify } from 'util';
import fs from 'fs';
import DBConnection from '../DatabaseAccess/DBConnection';
import {logger} from '../helpers/Logger';

/**
 * Used for truncate tables, which contain info from general log file
 */

// TODO: поправить пути до файлов

const root =
  '/home/regina/Документы/projects/bottleneck-search-api/src/SqlSources';

class DatabasePrepare {
  tablesSources = {
    original_queries: {
      source: `${root}/original_queries.sql`,
      exist: false,
    },
    filter: {
      source: `${root}/filter.sql`,
      exist: false,
    },
    statuses_configuration: {
      source: `${root}/statuses_configuration.sql`,
      exist: false,
    },
    parametrized_queries: {
      source: `${root}/parametrized_queries.sql`,
      exist: false,
    },
    user_host: {
      source: `${root}/user_host.sql`,
      exist: false,
    },
    queries_to_user_host: {
      source: `${root}/queries_to_user_host.sql`,
      exist: false
    },
    filtered_queries: {
      source: `${root}/filtered_queries.sql`,
      exist: false,
    },
    rejected_queries: {
      source: `${root}/rejected_queries.sql`,
      exist: false,
    },
    tables_statistic: {
      source: `${root}/tables_statistic.sql`,
      exist: false,
    },
    queries_to_tables: {
      source: `${root}/queries_to_tables.sql`,
      exist: false,
    },
    explain_replay_info: {
      source: `${root}/explain_replay_info.sql`,
      exist: false,
    },
    profile_replay_info: {
      source: `${root}/profile_replay_info.sql`,
      exist: false,
    },
  };

  createTables() {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);

    connection.beginTransaction(error => {
      if (error) {
        logger.logError(error);
      } else {
        Object.keys(this.tablesSources).forEach((tableName, index) => {
          const script = fs
            .readFileSync(this.tablesSources[tableName].source)
            .toString();
          promisifyQuery(script)
            .then(result => {
              if (result) {
                this.tablesSources[tableName].exist = true;
              }
            })
            .catch(err => {
              logger.logError(err);
              connection.rollback();
              connection.end();
            });
        });
      }
    });
  }

  async truncateCurrentTable(tableName) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);

    await promisifyQuery(`truncate master.${tableName};`)
  }

  truncateTables(prepareDatabaseCallback) {
    const dbConnection = new DBConnection();
    const connection = dbConnection.createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);

    connection.beginTransaction(error => {
      if (error) {
        logger.logError(error);
      } else {
        promisifyQuery(`
          SET FOREIGN_KEY_CHECKS = 0;
         
          truncate master.original_queries;
          truncate master.queries_to_tables;
          truncate master.queries_to_user_host;
          truncate master.filtered_queries;
          truncate master.rejected_original_queries;
          truncate master.parametrized_queries;
          truncate master.user_host;
          truncate master.tables_statistic;
          truncate master.explain_replay_info;
          truncate master.profile_replay_info;
          
          SET FOREIGN_KEY_CHECKS = 1;
        `)
          .then(() => {
            connection.commit();
            prepareDatabaseCallback(true);
            connection.end();
          })
          .catch(e => {
            logger.logError(e);
            prepareDatabaseCallback(false);
            connection.rollback();
            connection.end();
          });
      }
    });
  }
}
const databasePrepare = new DatabasePrepare();

export default databasePrepare;
