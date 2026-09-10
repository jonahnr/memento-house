import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("all five Memento Map experiences are defined with unique public routes",()=>{
 const source=read("lib/memento-map-types.ts");
 for(const id of ["wedding","family_reunion","celebration_of_life","next_chapter","events_community"])assert.match(source,new RegExp(`\\b${id}:`));
 for(const route of ["wedding","family-reunion","celebration-of-life","next-chapter","events"])assert.ok(source.includes(`route:"${route}"`));
});

test("migration preserves existing weddings and locks their type",()=>{
 const migration=read("supabase/migrations/012_memento_map_types.sql");
 assert.match(migration,/update public\.weddings set map_type='wedding',map_type_locked=true/i);
 assert.match(migration,/map_type set default 'wedding'/i);
 assert.match(migration,/map_type_locked boolean not null default false/i);
});

test("type selection is authenticated, validated, and immutable after setup",()=>{
 const route=read("app/api/maps/type/route.ts");
 assert.match(route,/requireUser/);
 assert.match(route,/isMementoMapType/);
 assert.ok(route.includes('eq("map_type_locked",false)'));
 assert.match(route,/map_type_locked:true/);
});

test("marketing and setup surfaces use the shared type configuration",()=>{
 assert.match(read("app/memento-map/create/page.tsx"),/MEMENTO_MAP_TYPE_IDS\.map/);
 assert.match(read("app/memento-map/[type]/page.tsx"),/typeFromRoute/);
 assert.match(read("app/memento-map/type-landing.tsx"),/MEMENTO_MAP_TYPES/);
});
