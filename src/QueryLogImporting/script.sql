create table master.original_queries
(
    id int auto_increment primary key,
    event_time varchar(20) not null,
    user_host varchar(40) not null ,
    thread_id int,
    server_id int,
    command_type varchar(10),
    argument text not null
);
