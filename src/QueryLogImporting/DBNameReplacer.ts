import { Parser } from 'node-sql-parser';

const DBNameReplacer = (query: string) => {
  const parser = new Parser();

  const mapper = {
    database: 'master',
    table_name: 'original_queries',
    columns: [
      'event_time',
      'user_host',
      'thread_id',
      'server_id',
      'command_type',
      'argument',
    ],
  };

  const parsedQuery = parser.astify(query);
  parsedQuery[0].table[0].table = mapper.table_name;
  parsedQuery[0].table[0].db = mapper.database;
  parsedQuery[0].columns = mapper.columns;

  return parser.sqlify(parsedQuery);
};

export default DBNameReplacer;
