import {Connection} from 'mysql';

import rejectSourceTypes from '../config/constants';
import {parametrizeQuery} from "../parser";
import RejectedQueryDataStore from "./RejectedQueryDataStore";

class ParametrizedQueriesDataStore {
    save(connection : Connection){
        const parametrizedQueries = [];
        const rejectedQueryDataStore = new RejectedQueryDataStore();

        connection.query('select query_text, id from master.suitable_original_queries;', (error, queries) => {

            queries.forEach(originalQuery => {
                const {query = '', error: parametrizeError = ''} = parametrizeQuery(originalQuery.query_text);
                if (parametrizeError){
                    rejectedQueryDataStore.save(parametrizeError, originalQuery.query_text, rejectSourceTypes.PARSER)
                }
                else {
                    parametrizedQueries.push(`('${query}', 'sha(${query})', 1)`);

                }
            });

            const commaSeparatedParametrizedQueries = parametrizedQueries.join(', ');

            connection.query(`insert into master.parametrized_queries (parsed_query, parsed_query_hash, query_count)
            values (${commaSeparatedParametrizedQueries}) on duplicate key update query_count = query_count + 1`, (result) => {
                console.log(result)
            })
        })
    }
}

export default ParametrizedQueriesDataStore;
