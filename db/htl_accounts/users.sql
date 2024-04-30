create table users
(
    id       bigserial
        constraint id_users
            primary key,
    email    text                                not null,
    password text                                not null,
    pepper   text                                not null,
    projects json,
    regdate  timestamp default CURRENT_TIMESTAMP not null
);

alter table users
    owner to tuser;

