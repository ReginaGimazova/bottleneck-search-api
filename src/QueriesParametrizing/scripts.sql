create table test.parametrized_queries
(
    id int primary key auto_increment,
    parsed_query text not null,
    parsed_query_hash int not null unique,
    query_count int not null
);