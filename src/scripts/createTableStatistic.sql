create table test.tables_statistic
(
    id int primary key auto_increment,
    table_name nvarchar(128) not null,
    table_name_hash int not null unique,
    call_count int not null
);