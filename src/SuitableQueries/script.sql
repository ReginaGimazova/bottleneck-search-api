create table suitable_original_queries
(
    id int auto_increment  primary key,
    user_host  varchar(40) not null ,
    query_text text not null
);

create table master.filter (
    id int primary key auto_increment not null,
    filter_query text not null ,
    type varchar(20) not null
);