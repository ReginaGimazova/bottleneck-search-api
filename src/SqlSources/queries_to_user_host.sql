create table master.queries_to_user_host (
  id int auto_increment not null primary key,
  parametrized_query_id int not null,
  user_host_id int not null,
  query_count int not null,
  foreign key (parametrized_query_id) references master.parametrized_queries(id) on delete cascade ,
  foreign key (user_host_id) references master.user_host(id) on delete cascade
);