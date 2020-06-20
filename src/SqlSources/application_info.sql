create table master.application_info (
    id int auto_increment not null primary key,
    progress float check ( progress <= 100)
);

insert into master.application_info (progress) values (0);