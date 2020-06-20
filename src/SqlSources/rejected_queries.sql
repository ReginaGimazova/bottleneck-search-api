create table master.rejected_original_queries (
  id int primary key auto_increment not null,
  error_text mediumtext not null,
  type varchar(20) not null,
  query_text mediumtext
);