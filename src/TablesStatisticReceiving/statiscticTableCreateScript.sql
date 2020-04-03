create table master.tables_statistic
(
    id int primary key auto_increment,
    table_name nvarchar(128) not null unique ,
    call_count int not null
);