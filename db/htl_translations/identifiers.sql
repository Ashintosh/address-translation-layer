create table identifiers
(
    id              integer not null
        constraint user_id_pk
            primary key,
    identifier      text    not null,
    identifier_salt text    not null,
    address_data    json    not null,
    password        text    not null,
    password_salt   text    not null
);

alter table identifiers
    owner to tuser;

