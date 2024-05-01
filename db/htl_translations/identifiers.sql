create table identifiers
(
    id           bigserial
        constraint id_pk
            primary key,
    identifier   text not null,
    address_data json not null
);

alter table identifiers
    owner to tuser;

