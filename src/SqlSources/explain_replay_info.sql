create table master.explain_replay_info
(
    id int primary key auto_increment,
    query_id int not null,
    explain_result json,
    foreign key (query_id) references filtered_queries(id) on delete cascade
);
