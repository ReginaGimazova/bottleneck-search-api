import { promisify } from 'util';

import TablesStatisticDataStore from '../TablesStatistic/TablesStatisticDataStore';
import ParametrizedQueriesDataStore from '../QueriesParametrizing/ParametrizedQueriesDataStore';
import DBConnection from '../DatabaseAccess/DBConnection';
import { logger } from '../helpers/Logger';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import ExplainQueriesDataStore from '../ExplainQueries/ExplainQueriesDataStore';
import ProfileQueriesDataStore from '../ProfileQueries/ProfileQueriesDataStore';
import UserHostDataStore from '../UserHost/UserHostDataStore';

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
        parsed_query_hash: ''
      };
    });
  }

  /**
   *
   * This function takes tuples (which created in 'createQueriesTuple' method) as argument
   * and returns ready for insert query string
   * tuple fields: user_host - from original log, argument - field from original log, parametrized_query_id
   */
  private convertTupleToQueryString = tuples =>
    tuples
      .map(
        ({ argument, parametrized_query_id }) =>
          `('${argument}', ${parametrized_query_id})`
      )
      .join(', ');

  /**
   *
   * @param promisifyQuery - promisified query for connection to tool database
   * This method supports 2 filtering modes (S - static, R - pattern) for filter original queries
   */
  private retrieveOriginalQueriesByFilter(promisifyQuery) {
    return promisifyQuery(
      `select user_host, argument from master.original_queries
       where not exists (
         select 1 from master.filter
            where type = 'S'
            and filter_query = original_queries.argument
         union
            select 1 from master.filter
            where type = 'R'
         and original_queries.argument like filter_query);`
    );
  }

  private async insertFilteredQueries({ connection, values }) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    const insertQuery = `
      insert into master.filtered_queries 
        ( query_text, parametrized_query_id) 
      values ${values}`;

    try {
      await promisifyQuery(insertQuery);
      connection.query('SET FOREIGN_KEY_CHECKS = 1;');
      logger.logInfo('Filtered queries saved')
      await analyzeProgress.updateProgress();

    } catch (insertError) {
      await analyzeProgress.resetCounter();
      logger.logError(insertError);
      connection.rollback();
    }
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

  public async getByStatusId({statusId, type, getQueryCallback}){
    const connection = new DBConnection().createToolConnection();
    const promisifyQuery = promisify(connection.query).bind(connection);

    const selectQueryTextForProfile  = `
      select query_text from master.filtered_queries
      inner join master.profile_replay_info on filtered_queries.id = profile_replay_info.query_id
      where profile_replay_info.id = ${statusId};
    `;

    const selectQueryTextForExplain  = `
      select query_text from master.filtered_queries
      inner join master.explain_replay_info on filtered_queries.id = explain_replay_info.query_id
      where explain_replay_info.id = ${statusId};
    `;

    const selectQueryText = type === 'explain' ? selectQueryTextForExplain : selectQueryTextForProfile;

    try {
      const filteredQueryText = await promisifyQuery(selectQueryText);
      getQueryCallback(filteredQueryText, undefined)
    } catch (e) {
      logger.logError(e);
      getQueryCallback(undefined, e.message);
    }
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

  async save(connection) {
    const promisifyQuery = promisify(connection.query).bind(connection);
    const parametrizedQueriesDataStore = new ParametrizedQueriesDataStore();
    const userHostDataStore = new UserHostDataStore();

    try {
      const queries = await this.retrieveOriginalQueriesByFilter(
        promisifyQuery
      );

      if (!queries.length) {
        return;
      }

      const filteredQueriesTuples = this.createQueriesTuple(queries);

      const updatedTuples = await parametrizedQueriesDataStore.getParametrizedQueries({
        connection,
        filteredQueriesTuples,
      });
      const values = this.convertTupleToQueryString(updatedTuples);
      await this.insertFilteredQueries({connection, values});

      userHostDataStore.saveUserHosts({connection, tuples: updatedTuples});

      try {
        const filteredQueries = await this.getAllFilteredQueries(
          connection
        );

        await this.nextAnalyzeProcess({ connection, filteredQueries });
      } catch (e) {
        await analyzeProgress.resetCounter();
        logger.logError(e);
        connection.rollback();
      }
    } catch (queriesError) {
      connection.rollback();
      await analyzeProgress.resetCounter();
      logger.logError(queriesError);
    }
  }
}

export default FilteredQueryDataStore;
