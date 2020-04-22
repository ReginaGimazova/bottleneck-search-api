create table filtered_queries
(
  id int auto_increment  primary key,
  user_host  varchar(40) not null ,
  query_text text not null
);
