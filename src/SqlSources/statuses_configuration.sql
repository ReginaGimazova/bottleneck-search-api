create table master.statuses_configuration (
    id int primary key auto_increment not null,
    value varchar(30) not null unique,
    type enum('EXPLAIN', 'PROFILE'),
    mode boolean
);
