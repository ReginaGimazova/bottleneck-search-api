create table master.parametrized_queries
(
    id int primary key auto_increment,
    parsed_query text not null check ( parsed_query <> '' ),
    parsed_query_hash char(40) not null unique,
    query_count int not null,
    user_host  varchar(40) not null,
    constraint UC_parametrized_query unique (parsed_query_hash, user_host)
);