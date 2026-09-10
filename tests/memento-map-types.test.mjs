import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("all five Memento Map experiences are defined with unique public routes",()=>{
 const source=read("lib/memento-map-types.ts");
 for(const id of ["wedding","family_reunion","celebration_of_life","next_chapter","events_community"])assert.match(source,new RegExp(`\\b${id}:`));
 for(const route of ["wedding","family-reunion","celebration-of-life","next-chapter","events"])assert.ok(source.includes(`route:"${route}"`));
});

test("migration preserves legacy maps as Wedding and enables several maps per owner",()=>{
 const migration=read("supabase/migrations/013_map_owned_product_lifecycle.sql");
 assert.match(migration,/set map_type='wedding', map_type_locked=true/i);
 assert.match(migration,/map_type set default 'wedding'/i);
 assert.match(migration,/drop constraint if exists weddings_owner_user_id_key/i);
 assert.match(migration,/drop trigger if exists on_auth_user_created/i);
});

test("paid fulfillment creates one typed map and seeds real categories",()=>{
 const fulfillment=read("lib/fulfillment.ts"),migration=read("supabase/migrations/013_map_owned_product_lifecycle.sql");
 assert.match(fulfillment,/provision_paid_memento_map/);
 assert.match(fulfillment,/defaultMapCategories/);
 assert.match(migration,/source_order_id/);
 assert.match(migration,/create table if not exists public\.map_categories/);
 assert.match(migration,/pg_advisory_xact_lock/);
});

test("map setup is authenticated, map-scoped, and cannot change its type",()=>{
 const route=read("app/api/maps/type/route.ts");
 assert.match(route,/requireUser/);
 assert.ok(route.includes('eq("id",mapId)'));
 assert.ok(route.includes('eq("owner_user_id",identity.user.id)'));
 assert.doesNotMatch(route,/map_type:type/);
});

test("marketing and map-scoped setup use the shared type configuration",()=>{
 assert.match(read("app/memento-map/create/page.tsx"),/MEMENTO_MAP_TYPES/);
 assert.match(read("app/memento-map/create/page.tsx"),/params\.get\("map"\)/);
 assert.match(read("app/memento-map/[type]/page.tsx"),/typeFromRoute/);
 assert.match(read("app/memento-map/type-landing.tsx"),/MEMENTO_MAP_TYPES/);
});

test("map access and dashboard selection are scoped to the individual map",()=>{
 assert.match(read("lib/map-entitlement.ts"),/eq\("map_id",mapId\)/);
 const dashboard=read("app/dashboard/dashboard.tsx");
 assert.match(dashboard,/URLSearchParams\(location\.search\)\.get\("map"\)/);
 assert.match(dashboard,/className="mapSwitcher"/);
 assert.match(dashboard,/maps\.map\(map=>/);
 assert.doesNotMatch(dashboard,/eq\("owner_user_id",user\.id\)\.single\(\)/);
});

test("onboarding resolves event locations and persists wedding venue coordinates",()=>{
 const setup=read("app/memento-map/create/page.tsx"),route=read("app/api/maps/type/route.ts");
 assert.match(setup,/LocationSearch/);
 assert.match(setup,/onQueryChange=\{\(\)=>setForm/);
 assert.match(setup,/eventLocation:"",eventLat:NaN,eventLng:NaN/);
 assert.match(setup,/eventLat:place\.lat,eventLng:place\.lng/);
 assert.match(route,/hasCoordinates/);
 assert.match(route,/from\("story_locations"\)/);
 assert.match(route,/anchorType=type==="wedding"\?"Wedding Venue":"Event Location"/);
});

test("dashboard, QR, story editor, and public map use type-specific experience labels",()=>{
 const config=read("lib/memento-map-types.ts"),dashboard=read("app/dashboard/dashboard.tsx"),map=read("app/map/[slug]/wedding-experience.tsx"),story=read("app/dashboard/components/story-editor-with-media.tsx"),qr=read("app/dashboard/components/qr-card.tsx");
 for(const phrase of ["Family reunion location","Travel places in their honor","Opening the memorial map","THEIR LIFE STORY, MAPPED","Event and community details"])assert.match(config,new RegExp(phrase,"i"));
 for(const phrase of ["Years remembered","Miles across their life story","Bring Our Family Together","Share a Memory of"])assert.match(config,new RegExp(phrase,"i"));
 for(const source of [dashboard,map,story,qr])assert.match(source,/mapExperienceLabels|mapCollectionLabels/);
 assert.doesNotMatch(map,/Opening the adventure map/);
 assert.doesNotMatch(story,/YOUR RELATIONSHIP, MAPPED/);
 assert.doesNotMatch(qr,/>Help Build<br/);
});
