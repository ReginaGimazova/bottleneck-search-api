import {Parser} from "node-sql-parser";
import originalQueries from "./originalQueries";

const DBNameReplacer = (tableName: string, database: string, originalQuery: string) => {
    const parser = new Parser();

    const parsedQuery = parser.astify(originalQuery);
    parsedQuery[0].table[0].table = tableName;
    parsedQuery[0].table[0].db = database;
    parsedQuery[0].columns = originalQueries.columns;

    return parser.sqlify(parsedQuery);
};

export default DBNameReplacer;