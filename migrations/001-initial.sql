----------
-- Up
----------

create table professions (
    id integer primary key,
    name text not null,
    url text not null
);
insert into professions (id, name, url)
values
    (129, 'First Aid', 'https://classic.wowhead.com/first-aid'),
    (164, 'Blacksmithing', 'https://classic.wowhead.com/blacksmithing'),
    (165, 'Leatherworking', 'https://classic.wowhead.com/leatherworking'),
    (171, 'Alchemy', 'https://classic.wowhead.com/alchemy'),
    (185, 'Cooking', 'https://classic.wowhead.com/cooking'),
    (186, 'Mining', 'https://classic.wowhead.com/mining'),
    (197, 'Tailoring', 'https://classic.wowhead.com/tailoring'),
    (202, 'Engineering', 'https://classic.wowhead.com/engineering'),
    (333, 'Enchanting', 'https://classic.wowhead.com/enchanting');

create table items (
    id integer primary key
);

create table spells (
    id integer primary key,
    name text not null,
    item_id integer,
    l1 integer,
    l2 integer,
    l3 integer,
    l4 integer,
    profession_id integer not null,
    constraint fk_spells_item_id_items foreign key (item_id) references items(id),
    constraint fk_spells_profession_id_professions foreign key (profession_id) references professions(id)
);

create table reagents (
    spell_id integer,
    item_id integer not null,
    count integer not null default 1,
    constraint fk_reagents_spell_id_spell foreign key (spell_id) references spells(id),
    constraint fk_reagents_item_id_spell foreign key (item_id) references items(id)
);

----------
-- Down
----------

drop table reagents;
drop table spells;
drop table items;
drop table professions;
