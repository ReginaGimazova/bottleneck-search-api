create table filtered_queries (
  id int auto_increment  primary key,
  user_host  varchar(40) not null ,
  query_text text not null,
  parametrized_query_id int not null ,
  foreign key (parametrized_query_id) references parametrized_queries(id) on delete cascade
);