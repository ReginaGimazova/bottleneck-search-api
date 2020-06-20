create table master.original_queries
(
    id int auto_increment primary key,
    event_time timestamp not null,
    user_host mediumtext not null ,
    thread_id int,
    server_id int,
    command_type varchar(64),
    argument mediumtext not null
);
