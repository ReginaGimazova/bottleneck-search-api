const { Parser } = require('node-sql-parser');
const parser = new Parser();

// ast.where.right.value = 'XXX';

// console.log(ast.columns[0].expr);

export const getSelectQueries = (query: string) => {
  const sqlValues = parser.astify(query)[0].values;
  const selectQueryObjects = sqlValues.map(val =>
    val.value.find(v => ('' + v.value).startsWith('select'))
  );
  const selectQueries = selectQueryObjects.reduce((result = [], selectQuery) => {
    if (selectQuery) {
      result.push(selectQuery.value);
    }
    return result;
  }, []);
  return selectQueries;
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
