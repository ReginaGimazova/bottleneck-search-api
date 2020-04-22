import { MysqlError } from 'mysql';

import TablesStatisticDataStore from '../TablesStatistic/TablesStatisticDataStore';
import ParametrizedQueriesDataStore from '../QueriesParametrizing/ParametrizedQueriesDataStore';
import DBConnection from '../DatabaseAccess/DBConnection';
import Logger from '../helpers/Logger';

class FilteredQueryDataStore {
  /**
   *
   * This function takes tuple as argument and returns ready for insert query string
   * user_host, argument, parametrized_query_id - tuple fields
   */
  private convertTupleToQueryString = tuples => {
    const queriesArray = tuples.map(
      ({ user_host, argument, parametrized_query_id }) => {
        if (parametrized_query_id) {
          return `('${user_host}', '${argument}', ${parametrized_query_id})`;
        }
      }
    );
    return queriesArray.join(', ');
  };

  /**
   *
   * @param queriesArray
   *
   * Сonverting an array of queries (queriesArray) into tuples
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

    tuples.forEach((tuple, index) => {
      parametrizedQueriesDataStore.save(connection, tuple, id => {
        if (!id) {
          tuples[index] = undefined;
        }
        if (id) {
          tuples[index].parametrized_query_id = id;
          if (index === tuples.length - 1) {
            callback(tuples);
          }
        }
      });
    });
  }

  /**
   *
   * @param connection
   * @param logger
   * @param callback
   *
   * Callback from save method returns received original queries that have already passed through the filter
   */
  private retrieveOriginalQueriesAccordingToFilter({
    connection,
    logger,
    callback,
  }) {
    connection.query(
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
        'and original_queries.argument like filter_query);',

      (error: MysqlError, queries) => {
        if (queries) {
          callback(queries);
        } else if (error) {
          logger.logError(error);
          connection.rollback();
          callback([]);
        }
      }
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

    const tablesStatisticDataStore = new TablesStatisticDataStore();

    this.retrieveOriginalQueriesAccordingToFilter({
      connection,
      logger,
      callback: queries => {
        if (!queries.length) {
          return;
        }

        this.getParametrizedQueries({
          connection,
          queries,
          callback: tuples => {
            const values = this.convertTupleToQueryString(tuples);
            const insertQuery = ` insert into master.filtered_queries (user_host, query_text, parametrized_query_id) values ${values} `;

            connection.query(insertQuery, (insertError: MysqlError, result) => {
              if (insertError) {
                logger.logError(insertError);
                connection.rollback();
              } else if (result) {
                console.log('Filtered queries successfully saved.')
                tablesStatisticDataStore.save(connection);
              }
            });
          },
        });
      },
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
      'select id, query_text from suitable_original_queries;',
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
