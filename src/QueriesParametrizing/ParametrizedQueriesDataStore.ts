import { MysqlError } from 'mysql';
import sha from 'sha1';
import { promisify } from 'util';

import { rejectedQueryDataStore } from '../RejectedQueriesSaving/RejectedQueryDataStore';
import queryParametrizer from './queryParametrizer';
import { logger } from '../helpers/Logger';
import DBConnection from '../DatabaseAccess/DBConnection';
import { analyzeProgress } from '../AnalyzeProgress/AnalyzeProgress';
import QueriesDataStoreBase from "../helpers/QueriesDataStoreBase";

class ParametrizedQueriesDataStore extends QueriesDataStoreBase {
  /**
   *
   * @param argument - query string
   * @param connection - tool database connection
   *
   * @summary returns parametrized string for this argument (query text)
   */
  private parametrizeQuery({ argument, connection }) {
    const { query = '', error: parametrizeError = '' } = queryParametrizer(
      argument
    );

    if (parametrizeError) {
      rejectedQueryDataStore.save({
        connection,
        errorText: parametrizeError,
        rejectedQuery: argument,
        type: 'PARSER',
      });
      return '';
    } else if (query) {
      return query;
    }
  }

  /**
   *
   * @param connection - tool database connection
   * @param query - parametrized query text
   * @param hash - parametrized query hash
   *
   * @summary Save data to parametrized_queries table
   */
  async save({connection, query, hash}) {
    const promisifyQuery = promisify(connection.query).bind(connection);

    const insertQuery = `
      insert into master.parametrized_queries (parsed_query, parsed_query_hash) 
      values ("${query}", "${hash}")
    `;

    try {
      const result = await promisifyQuery(insertQuery);
      if (result.insertId) {
        return result.insertId;
      }
    } catch (e) {
      await analyzeProgress.resetCounter();
      logger.logError(e);
    }
  }

  /**
   *
   * @param connection - tool database connection
   * @param hash - parametrized query hash
   *
   * @summary Return id if this parametrized query already saved or insert this  parametrized query string
   */
  private async returnIdOrInsert({ connection, hash }) {

    const selectString = `
      select id from master.parametrized_queries
      where parsed_query_hash = '${hash}'
    `;

    const promisifyQuery = promisify(connection.query).bind(connection);

    try {
      const result = await promisifyQuery(selectString);
      if (result.length !== 0) {
        return result[0].id;
      }
    } catch (e) {
      await analyzeProgress.resetCounter();
      logger.logError(e);
      connection.rollback();
    }
  }

  /**
   *
   * @param connection - connection to tool database
   * @param tuples - created tuples from filtered queries
   * (if an error occurred during parsing using the 'node-sql-parser' library,
   * then such tuple cancelled (= undefined))
   *
   * @summary This function returns updated query tuples with parametrized_query_id
   */

  public async getParametrizedQueries({ connection, filteredQueriesTuples }) {
    for (let index = 0; index < filteredQueriesTuples.length; index++) {
      let id;
      const tuple = filteredQueriesTuples[index];
      const {argument} = tuple;

      const query = this.parametrizeQuery({
        argument,
        connection,
      });

      if (!query) {
        filteredQueriesTuples[index] = undefined;
      }

      const hash = sha(query);

      id = await this.returnIdOrInsert({
        connection,
        hash
      });

      if (!id && filteredQueriesTuples[index]) {
        id = await this.save({connection, query, hash});
      }

      tuple.parametrized_query_id = id;

      if (index === filteredQueriesTuples.length - 1) {
        const correctTuples = filteredQueriesTuples.filter(value => value);
        logger.logInfo('Parametrized queries saved');
        await analyzeProgress.updateProgress();
        return correctTuples;
      }
    }
  }

  /**
   *
   * @param tables - a set of tables
   *
   * @summary Return prepared part of query string with tables_statistic, queries_to_tables relationships join
   */
  protected tablesQueryBuild(tables): string {
    return super.tablesQueryBuild(tables);
  }

  /**
   *
   * @param tables - a set of tables for find matching queries
   * @param byHost - boolean value. If byHost = true, then queries should grouped by sql and user host
   * @param callback - this function return data and error to controller
   */
  getAll({ tables, byHost, callback }) {
    const connection = new DBConnection().createToolConnection();

    const tablesJoinPart =  this.tablesQueryBuild(tables);

    const groupBySql = `
      select parametrized_queries.id, parsed_query, queries_to_user_host.query_count
      from master.parametrized_queries
      inner join (
        select
          parametrized_query_id,
          sum(query_count) query_count
        from master.queries_to_user_host
        group by parametrized_query_id) as queries_to_user_host
      on parametrized_queries.id = queries_to_user_host.parametrized_query_id
      ${tables.length > 0 ? tablesJoinPart : ''}
      order by query_count desc;
    `;

    const groupBySqlAndHost = `
      select parametrized_queries.id, parsed_query, queries_to_user_host.query_count
      from master.parametrized_queries
      inner join (
        select
          user_host_id,
          parametrized_query_id,
          sum(query_count) query_count
        from master.queries_to_user_host
        group by parametrized_query_id, user_host_id) as queries_to_user_host
      on parametrized_queries.id = queries_to_user_host.parametrized_query_id
      inner join master.user_host on user_host.id = queries_to_user_host.user_host_id
      ${tables.length > 0 ? tablesJoinPart : ''}
      order by query_count desc;
    `;

    const queryString = byHost ? groupBySqlAndHost : groupBySql;

    connection.query(queryString, async (err: MysqlError, result: any) => {
      if (result) {
        callback(result, undefined);
        if (result.length){
          await analyzeProgress.resetCounter();
        }
      }
      if (err) {
        logger.logError(err);
        callback(undefined, err);
      }
    });

    connection.end();
  }
}

export default ParametrizedQueriesDataStore;
