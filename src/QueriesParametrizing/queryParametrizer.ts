import { Parser } from 'node-sql-parser';

const queryParametrizer = originalQuery => {
  const parser = new Parser();

  const recursiveVisitorOfQuery = astObject => {
    const constTypes = ['string', 'number', 'boolean', 'expr_list'];
    const leftRightNodes = ['binary_expr'];
    if (astObject) {
      if (constTypes.includes(astObject.type)) {
        astObject.type = 'string';
        astObject.value = 'X';
      } else if (leftRightNodes.includes(astObject.type)) {
        recursiveVisitorOfQuery(astObject.left);
        recursiveVisitorOfQuery(astObject.right);
      } else if (astObject.type === 'select') {
        [].concat(astObject.columns).forEach(column => {
          recursiveVisitorOfQuery(column.expr);
        });
        recursiveVisitorOfQuery(astObject.where);
      } else if (astObject.type === 'unary_expr'){
        recursiveVisitorOfQuery(astObject.expr)
      } else if (astObject.parentheses === true) {
        recursiveVisitorOfQuery(astObject.ast)
      }
    }
    return astObject;
  };

  try {
    let astObject = parser.astify(originalQuery);

    astObject = recursiveVisitorOfQuery(astObject);

    return { query: parser.sqlify(astObject), error: '' };
  } catch (e) {
    return { query: '', error: e.message };
  }
};

export default queryParametrizer;
