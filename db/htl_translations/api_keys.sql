create table api_keys
(
    id      bigserial
        constraint api_keys_pk
            primary key,
    name    text                                not null,
    key     text                                not null,
    crtdate timestamp default CURRENT_TIMESTAMP not null
);

alter table api_keys
    owner to tuser;

