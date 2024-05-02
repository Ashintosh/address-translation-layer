create table identifiers
(
    id           bigserial
        constraint id_pk
            primary key,
    identifier   text  not null
        constraint identifiers_pk
            unique,
    address_data jsonb not null
);

alter table identifiers
    owner to tuser;

