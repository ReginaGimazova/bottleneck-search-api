import originalQueries from "./tableMappers/originalQueries";
import {Parser} from "node-sql-parser";

const parser = new Parser();

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
    return [];
    // console.log(e);
  }
};

export const parametrizeQuery = (originalQuery) => {

  const recursiveVisitorOfQuery = (astObject) => {
    const constTypes = ['string', 'number', 'boolean'];
    const leftRightNodes = ['binary_expr'];
    if (astObject) {

      if (constTypes.includes(astObject.type)) {
        astObject.type = 'number';
        astObject.value = 123456789;

      } else if (leftRightNodes.includes(astObject.type)) {
        recursiveVisitorOfQuery(astObject.left);
        recursiveVisitorOfQuery(astObject.right);
      } else if (astObject.type === 'select') {
        [].concat(astObject.columns).forEach(column => {
          recursiveVisitorOfQuery(column.expr);
        });
        recursiveVisitorOfQuery(astObject.where)
      }
    }
    return astObject;
  };

  try {
    let astObject = parser.astify(originalQuery);

    astObject = recursiveVisitorOfQuery(astObject);

    return parser.sqlify(astObject);
  }
  catch (e) {
    //console.log(e.message)
  }
};
