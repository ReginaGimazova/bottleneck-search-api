create table master.profile_replay_info
(
    id int primary key auto_increment,
    query_id int not null,
    status varchar(40),
    duration float,
    foreign key (query_id) references filtered_queries(id) on delete cascade
);
