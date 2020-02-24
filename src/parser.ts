import originalQueries from "./tableMappers/originalQueries";
import {Parser} from "node-sql-parser";
import {parse, stringify} from 'js-sql-parser';

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

  let tableList = [];

  try {
    tableList = parser.tableList(selectQuery, opt);
    return tableList;
  } catch (e) {
    console.log(e);
  }
};

export const parametrizeQuery = (originalQuery: string) => {

  const recursiveVisitorOfQuery = (query) => {
    const constTypes = ['String', 'Number', 'Boolean'];
    const leftRightNodes = ['AndExpression', 'ComparisonBooleanPrimary'];
    if (constTypes.includes(query.type)){
      query.value = 'X';
    }
    else if (leftRightNodes.includes(query.type)) {
      recursiveVisitorOfQuery(query.left);
      recursiveVisitorOfQuery(query.right);
    }
    else if (query.type === 'Select'){
      recursiveVisitorOfQuery(query.where);
    }
    return query;
  };

  try {
    const parsedQuery = parse(originalQuery);
    const {value} = parsedQuery;

    parsedQuery.value = recursiveVisitorOfQuery(value);
    return stringify(parsedQuery);
  }
  catch (e) {
    console.log(e.message)
  }
};
