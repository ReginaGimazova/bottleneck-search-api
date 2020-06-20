create table master.filter (
    id int primary key auto_increment not null,
    filter_query mediumtext not null ,
    type enum('S', 'R')
);