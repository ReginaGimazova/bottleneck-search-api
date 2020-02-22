import originalQueries from "./tableMappers/originalQueries";
import {Parser} from "node-sql-parser";

const parser = new Parser();

// ast.where.right.value = 'XXX';

// console.log(ast.columns[0].expr);

export const createInsertQuery = (tableName: string, database: string, originalQuery: string) => {
  const parsedQuery = parser.astify(originalQuery);
  parsedQuery[0].table[0].table = tableName;
  parsedQuery[0].table[0].db = database;
  parsedQuery[0].columns = originalQueries.columns;

  return parser.sqlify(parsedQuery);
};

export const getTableList = (selectQuery: string) => {
  const opt = {
    database: 'MySQL',
  };

  let tableList;

  try {
    tableList = parser.tableList(selectQuery, opt);
    return tableList;
  } catch (e) {
    console.log(e);
  }
};
