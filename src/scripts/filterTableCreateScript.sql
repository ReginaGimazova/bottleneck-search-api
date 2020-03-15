create table master.filter (
    id int primary key auto_increment not null,
    filter_query text not null ,
    type varchar(20) not null
);