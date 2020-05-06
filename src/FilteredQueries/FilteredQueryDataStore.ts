import { MysqlError } from 'mysql';
import { promisify } from 'util';

import TablesStatisticDataStore from '../TablesStatistic/TablesStatisticDataStore';
import ParametrizedQueriesDataStore from '../QueriesParametrizing/ParametrizedQueriesDataStore';
import DBConnection from '../DatabaseAccess/DBConnection';
import Logger from '../helpers/Logger';
import {analyzeProgress} from "../AnalyzeProgress/AnalyzeProgress";

class FilteredQueryDataStore {
  /**
   *
   * This function takes tuple as argument and returns ready for insert query string
   * user_host, argument, parametrized_query_id - tuple fields
   */
  private convertTupleToQueryString = tuples => {
    const queriesArray = tuples.map(
      ({ user_host, argument, parametrized_query_id }) =>`('${user_host}', '${argument}', ${parametrized_query_id})`
    );

    return queriesArray.join(', ');
  };

  /**
   *
   * @param queriesArray
   *
   * Convert an array of queries (queriesArray) into tuples
   */
  private createQueriesTuple(queriesArray) {
    return queriesArray.map(item => {
      return {
        user_host: item.user_host,
        argument: item.argument,
        parametrized_query_id: undefined,
      };
    });
  }

  /**
   *
   * @param connection
   * @param queries
   * @param callback
   *
   * Callback from save method return query tuples with parametrized_query_id
   */
  private getParametrizedQueries({ connection, queries, callback }) {
    const parametrizedQueriesDataStore = new ParametrizedQueriesDataStore();
    const tuples = this.createQueriesTuple(queries);
    const logger = new Logger();

    tuples.forEach(async (tuple, index) => {
      try {
        const result = await parametrizedQueriesDataStore.save(
          connection,
          tuple
        );

        if (!result) {
          tuples[index] = undefined;
        } else {
          const { insertId } = result;
          tuples[index].parametrized_query_id = insertId;
        }

        const correctTuples = tuples.filter(t => t);

        if (!(correctTuples.find(t => !t.parametrized_query_id))) {
          analyzeProgress.updateProgress(40);
          callback(correctTuples);
        }
      } catch (error) {
        logger.logError(error);
        connection.rollback();
      }
    });
  }

  /**
   *
   * @param connection
   * @param logger
   *
   * Callback from save method returns received original queries that have already passed through the filter
   */
  private retrieveOriginalQueriesAccordingToFilter({ promisifyQuery, logger }) {

    return promisifyQuery (
      'select user_host, argument from master.original_queries ' +
        'where not exists ( ' +
        'select 1 from master.filter ' +
        'where ' +
        "type = 'S' " +
        'and filter_query = original_queries.argument ' +
        'union ' +
        'select 1 from master.filter ' +
        'where ' +
        "type = 'R' " +
        'and original_queries.argument like filter_query);'
    );
  }

  /**
   *
   * @param connection
   *
   * Insert filtered queries and call saving tables
   */
  save(connection) {
    const logger = new Logger();
    const promisifyQuery = promisify(connection.query).bind(connection);

    const tablesStatisticDataStore = new TablesStatisticDataStore();

    this.retrieveOriginalQueriesAccordingToFilter({
      promisifyQuery,
      logger,
    })
      .then(async queries => {
        if (!queries.length) {
          return;
        }
        this.getParametrizedQueries({
          connection,
          queries,
          callback: async tuples => {
            const values = this.convertTupleToQueryString(tuples);

            connection.query('SET FOREIGN_KEY_CHECKS = 0;');

            const insertQuery = `insert into master.filtered_queries (user_host, query_text, parametrized_query_id) values ${values}`;

            try {
              await promisifyQuery(insertQuery);
              analyzeProgress.updateProgress(60);
              console.log('Filtered queries successfully saved.');

              connection.query('SET FOREIGN_KEY_CHECKS = 1;');

              await tablesStatisticDataStore.save(connection);
            } catch (insertError) {
              logger.logError(insertError);
              connection.rollback();
            }
          },
        });
      })
      .catch(queriesError => {
        connection.rollback();
        logger.logError(queriesError);
      });
  }

  /**
   *
   * @param callback
   */
  getAll(callback) {
    const queries = [];

    const dbConnection = new DBConnection();
    const connection = dbConnection.create();
    const logger = new Logger();

    connection.query(
      'select id, query_text from filtered_queries;',
      (err: MysqlError, result: any) => {
        if (result) {
          result.forEach(({ query_text, id }) => {
            queries.push({
              query_text,
              id,
            });
          });
          callback(queries, undefined);
        }
        if (err) {
          logger.logError(err);
          callback(undefined, err);
        }
      }
    );
    connection.end();
  }
}

export default FilteredQueryDataStore;
