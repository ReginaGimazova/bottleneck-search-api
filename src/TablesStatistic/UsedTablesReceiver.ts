import { Parser } from 'node-sql-parser';

const usedTablesReceiver = (selectQuery: string) => {
  const parser = new Parser();

  const opt = {
    database: 'MySQL',
  };

  const goThroughAstObject = astElement => {
    let tableList = [];

    if (astElement && astElement.table) {
      tableList.push(astElement.table);
    }
    if (astElement && astElement.columns && astElement.columns.length > 0) {
      astElement.columns.forEach(column => {
        tableList = tableList.concat(goThroughAstObject(column));
      });
    }
    if (astElement && astElement.where) {
      tableList = tableList.concat(goThroughAstObject(astElement.where));
    }
    if (astElement && astElement.left){
      tableList = tableList.concat(goThroughAstObject(astElement.left));
    }
    if (astElement && astElement.right){
      tableList = tableList.concat(goThroughAstObject(astElement.right));
    }
    if (astElement && astElement.expr){
      tableList = tableList.concat(goThroughAstObject(astElement.expr));
    }
    if (astElement && astElement.from) {
      astElement.from.forEach(value => {
        tableList = tableList.concat(goThroughAstObject(value));
      });
    }
    return tableList;
  };

  try {
    const astObject = parser.astify(selectQuery, opt);
    const tables = goThroughAstObject(astObject);

    return { tables, error: '' };
  } catch (e) {
    return { tables: [], error: e.message };
  }
};

export default usedTablesReceiver;
