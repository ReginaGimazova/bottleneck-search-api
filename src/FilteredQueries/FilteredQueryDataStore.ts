import { promisify } from 'util';

import TablesStatisticDataStore from '../TablesStatistic/TablesStatisticDataStore';
import ParametrizedQueriesDataStore from '../QueriesParametrizing/ParametrizedQueriesDataStore';
import DBConnection from '../DatabaseAccess/DBConnection';
import {logger} from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import ExplainQueriesDataStore from '../ExplainQueries/ExplainQueriesDataStore';
import ProfileQueriesDataStore from '../ProfileQueries/ProfileQueriesDataStore';

class FilteredQueryDataStore {
  protected prodDbConnection() {
    const prodConnection = new DBConnection();
    return prodConnection.createProdConnection();
  }

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
   * This function takes tuples (which created in 'createQueriesTuple' method) as argument
   * and returns ready for insert query string
   * tuple fields: user_host - from original log, argument - field from original log, parametrized_query_id
   */
  private convertTupleToQueryString = tuples => {
    const queriesArray = tuples.map(
      ({ user_host, argument, parametrized_query_id }) =>
        `('${user_host}', '${argument}', ${parametrized_query_id})`
    );

    return queriesArray.join(', ');
  };

  /**
   *
   * @param connection - connection to tool database
   * @param queries - filtered queries
   * @param callback - return updated tuples with parametrized_queries_id for each tuple
   * (if an error occurred during parsing using the 'node-sql-parser' library,
   * then such tuple cancelled (= undefined))
   *
   * Callback from save method return query tuples with parametrized_query_id
   */

  // maybe better move to ParametrizedQueriesDataStore
  private getParametrizedQueries({ connection, queries, callback }) {
    const parametrizedQueriesDataStore = new ParametrizedQueriesDataStore();
    const tuples = this.createQueriesTuple(queries);

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

        if (!correctTuples.find(t => !t.parametrized_query_id)) {
          analyzeProgress.parametrizedQueriesInserted();
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
   * @param promisifyQuery - promisified query for connection to tool database
   * This method supports 2 filtering modes (S - static, R - pattern) for filter original queries
   */
  private retrieveOriginalQueriesByFilter(promisifyQuery) {
    return promisifyQuery(
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
   * @param connection - connection to tool database
   *
   */
  public getAllFilteredQueries(connection) {
    const promisifyQuery = promisify(connection.query).bind(connection);
    return promisifyQuery('select id, query_text from master.filtered_queries');
  }

  /**
   *
   * @param connection - connection to tool database
   * @param filteredQueries
   *
   * This method checks finishing of the analysis to commit the transaction and close connections
   *
   * tablesStatisticDataStore.save(), explainQueriesDataStore.save() and profileQueriesDataStore.save() -
   * async functions which work asynchronously, since they are independent of each other
   */

  // check is this functions async
  private async nextAnalyzeProcess({ connection, filteredQueries }) {
    const tablesStatisticDataStore = new TablesStatisticDataStore();
    const explainQueriesDataStore = new ExplainQueriesDataStore();
    const profileQueriesDataStore = new ProfileQueriesDataStore();

    const prodConnection = this.prodDbConnection();

    const readyToCommit = {
      tables: false,
      explain: false,
      profile: false,
    };

    const checkAllData = () => {
      if (Object.values(readyToCommit).every(item => item)) {
        connection.commit();
        prodConnection.end();
        connection.end();
      }
    };

    tablesStatisticDataStore.save({
      connection,
      queries: filteredQueries,
      callback: tablesInserted => {
        readyToCommit.tables = tablesInserted;
        checkAllData();
      },
    });

    explainQueriesDataStore.save({
      connection,
      queries: filteredQueries,
      prodConnection,
      callback: explainInserted => {
        readyToCommit.explain = explainInserted;
        checkAllData();
      },
    });

    await profileQueriesDataStore.save({
      connection,
      queries: filteredQueries,
      prodConnection,
      callback: profileInserted => {
        readyToCommit.profile = profileInserted;
        checkAllData();
      },
    });
  }
  /**
   *
   * @param connection - connection to tool database
   *
   * Insert filtered queries and next steps for analysis
   */

  // TODO: refactor this method
  async save(connection) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    try {
      const queries = await this.retrieveOriginalQueriesByFilter(promisifyQuery);

      if (!queries.length) {
        return;
      }

      this.getParametrizedQueries({
        connection,
        queries,
        callback: async tuples => {
          const values = this.convertTupleToQueryString(tuples);

          // TODO: try to remove this check

          connection.query('SET FOREIGN_KEY_CHECKS = 0;');

          const insertQuery = `
            insert into master.filtered_queries (user_host, query_text, parametrized_query_id) values ${values}`;

          try {
            await promisifyQuery(insertQuery);
            connection.query('SET FOREIGN_KEY_CHECKS = 1;');
            analyzeProgress.filteredQueriesInserted();

          } catch (insertError) {
            analyzeProgress.handleErrorOnLogAnalyze(
              'There was an error in analyzing the general log during the inserting of filtered queries'
            )
            logger.logError(insertError);
            connection.rollback();
          }

          try {
            const filteredQueries = await this.getAllFilteredQueries(connection);

            if (!filteredQueries.length) {
              throw new Error(
                'Filtered queries table does not include any data'
              );
            }

            await this.nextAnalyzeProcess({ connection, filteredQueries });
          } catch (e) {
            logger.logError(e);
            connection.rollback();
          }
        },
      });
    } catch (queriesError) {
      connection.rollback();
      logger.logError(queriesError);
    }
  }
}

export default FilteredQueryDataStore;
