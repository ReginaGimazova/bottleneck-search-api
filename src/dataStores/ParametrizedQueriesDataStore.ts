import {Connection, MysqlError} from 'mysql';
import {parametrizeQuery} from "../parser";

class ParametrizedQueriesDataStore {
    save(connection : Connection, queries: any[]){
        queries.forEach(async query => {
            const parametrizedQuery = parametrizeQuery(query.query_text);
            await connection.query(`insert into test.parametrized_queries (parsed_query, parsed_query_hash, query_count) 
                values (${parametrizedQuery}, sha(${parametrizedQuery}), 1) on duplicate key update query_count = query_count + 1`)
        });
    }
}

export default ParametrizedQueriesDataStore;
