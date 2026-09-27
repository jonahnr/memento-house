import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const {PATCH}=await loadTs('app/api/maps/settings/route.ts');
const {GET}=await loadTs('app/api/map-timeline/route.ts');
const ownerId='11111111-1111-4111-8111-111111111111',mapId='22222222-2222-4222-8222-222222222222';
const manual={id:'manual',title:'Manual chapter',description:'Preserved',story_type:'Milestone',event_date:'2020-01-01',sort_order:1,latitude:39,longitude:-84};
const entries=[{id:'guest',category:'Guest Memory',title:'Guest memory',date_value:'2019-01-01',sort_date:'2019-01-01',story:'Preserved',status:'published',visibility:'link'},{id:'legacy',category:'Milestone',title:'Legacy owner chapter',sort_date:'2021-01-01',story:'Preserved',status:'published',visibility:'link'}];
async function fixture(run){
 const original=global.fetch,previous=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-service';
 const state={tier:'timeline-plus',owned:true,map:{id:mapId,owner_user_id:ownerId,map_type:'family_reunion',title:'Family',event_metadata:{organization_name:'Keep me',custom_existing_setting:42}},writes:[]};
 global.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url||input),method=init?.method||'GET',table=url.pathname.split('/').pop();let data;
  if(url.pathname.endsWith('/auth/v1/user'))data={id:ownerId,user_metadata:{},email:'fixture@example.com'};
  else if(url.pathname.includes('/auth/v1/admin/users/'))data={user:{id:ownerId,user_metadata:{}}};
  else if(table==='weddings'){
   if(method==='PATCH'){state.writes.push({table,method});assert.equal(url.searchParams.get('owner_user_id'),`eq.${ownerId}`);Object.assign(state.map,JSON.parse(init.body));data=state.map}
   else if(url.searchParams.get('select')==='map_tier')data={map_tier:state.tier};
   else data=state.owned?state.map:null;
  }else if(table==='timeline_entries')data=entries;
  else if(table==='story_locations')data=[manual];
  else if(['timeline_photos','media_assets','destinations'].includes(table))data=[];
  else throw new Error('Unexpected request '+url.pathname);
  return Response.json(data);
 };
 try{await run(state)}finally{global.fetch=original;if(previous===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=previous}
}
const patch=body=>PATCH(new Request('https://example.com/api/maps/settings',{method:'PATCH',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify({mapId,...body})}));
test('presentation saves merge existing metadata and are scoped to the owner and map',()=>fixture(async state=>{
 assert.equal((await patch({typography_theme:'romantic'})).status,200);assert.equal(state.map.event_metadata.organization_name,'Keep me');assert.equal(state.map.event_metadata.custom_existing_setting,42);
 assert.equal((await patch({include_guest_memories:false})).status,200);assert.equal(state.map.event_metadata.typography_theme,'romantic');assert.equal(state.map.event_metadata.include_guest_memories,false);assert.ok(state.writes.every(write=>write.table==='weddings'));
 state.owned=false;assert.equal((await patch({typography_theme:'classic'})).status,404);
}));
test('presentation API rejects unknown themes and unauthorized Timeline settings',()=>fixture(async state=>{
 assert.equal((await patch({typography_theme:'arbitrary-font'})).status,400);state.tier='map';assert.equal((await patch({include_guest_memories:false})).status,403);assert.equal(state.writes.length,0);
 assert.equal((await PATCH(new Request('https://example.com/api/maps/settings',{method:'PATCH'}))).status,401);
}));
test('public story feed hides and restores guest records while retaining manual and legacy chapters',()=>fixture(async state=>{
 const read=async()=>{const response=await GET(new Request('https://example.com/api/map-timeline?slug=family'));assert.equal(response.status,200);return(await response.json()).entries.map(entry=>entry.id)};
 assert.deepEqual(await read(),['guest','story-manual','legacy']);state.map.event_metadata.include_guest_memories=false;assert.deepEqual(await read(),['story-manual','legacy']);state.map.event_metadata.include_guest_memories=true;assert.deepEqual(await read(),['guest','story-manual','legacy']);assert.equal(state.writes.length,0);assert.equal(entries.length,2);
}));
