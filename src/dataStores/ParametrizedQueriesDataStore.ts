import {Connection} from 'mysql';
import {parametrizeQuery} from "../parser";

class ParametrizedQueriesDataStore {
    save(connection : Connection, queries: any[]){
        const parametrizedQueries = [];
        queries.forEach(query => {
            const parametrizedQuery = parametrizeQuery(query.query_text);
            parametrizedQueries.push(parametrizedQuery);
        });

        const commaSeparatedParametrizedQueries = parametrizedQueries
            .map(value => `('${value}', 'sha(${value})', 1)`)
            .join(', ');

        connection.query(`insert into test.parametrized_queries (parsed_query, parsed_query_hash, query_count)
            values (${commaSeparatedParametrizedQueries}) on duplicate key update query_count = query_count + 1`, (result) => {
            console.log(result)
        })
    }
}

export default ParametrizedQueriesDataStore;
