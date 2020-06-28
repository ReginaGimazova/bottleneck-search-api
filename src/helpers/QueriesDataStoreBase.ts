class QueriesDataStoreBase {
  /**
   *
   * @param tables - a set of tables according to which queries should been fetched
   *
   * @summary Returns a part of query to use tables_statistic relation
   */

  protected tablesQueryBuild(tables){
    const searchTables =
      tables.length > 0 ? tables.map(table => `"${table}"`).join(', ') : '';

    const tablesJoinPart = `
      inner join (
        select parametrized_query_id
        from filtered_queries
        inner join queries_to_tables on filtered_queries.id = queries_to_tables.query_id
        inner join tables_statistic
          on queries_to_tables.table_id = tables_statistic.id
          and json_search(json_array(${searchTables}), 'all', table_name) > 0
        group by parametrized_query_id) as filtered_by_tables
        on filtered_by_tables.parametrized_query_id = parametrized_queries.id
    `;

    return tablesJoinPart
  }
}

export default QueriesDataStoreBase;