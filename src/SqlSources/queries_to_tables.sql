create table queries_to_tables (
    id int primary key auto_increment not null,
    query_id int not null,
    table_id int not null,
    foreign key (query_id) references filtered_queries(id) on delete cascade ,
    foreign key (table_id) references tables_statistic(id) on delete cascade
);