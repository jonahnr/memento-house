import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='outputs/dashboard-revisions-qa';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1360,height:1000},timezoneId:'America/New_York',acceptDownloads:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.com',aud:'authenticated',role:'authenticated',user_metadata:{}};
const session={access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user};
let tier='timeline-plus';
let wedding={id:'22222222-2222-4222-8222-222222222222',partner_one_name:'Jonah',partner_two_name:'Kate',wedding_date:'2027-10-17',title:'Our Adventure Map',slug:'qa-event',welcome_message:'Welcome to our gathering',accent_color:'#9a7441',map_type:'wedding',configured_at:'2026-09-01',event_metadata:{organization_name:'Preserve this'}};
const story={id:'story-one',title:'Owner chapter',description:'A manual chapter that must remain',story_type:'Milestone',event_date:'2020-02-01',sort_order:0,image_url:null,location_name:'Cincinnati, Ohio',latitude:39.1,longitude:-84.5};
let memories=[{id:'memory-one',title:'Guest memory',story:'A memory shared by a friend',category:'Guest Memory',contributor_name:'Guest Friend',sort_date:'2019-06-01',date_value:'2019-06-01',approximate_date_label:null,visibility:'link',status:'published',destination:{id:'destination-one',location_name:'Boston',latitude:42.36,longitude:-71.06}},{id:'memory-legacy',title:'Legacy owner timeline chapter',story:'An existing Timeline record',category:'Milestone',contributor_name:'Host',sort_date:'2021-01-01',date_value:'2021-01-01',visibility:'link',status:'published',destination:null}];
const writes=[];
await context.route('**/*.supabase.co/**',async route=>{
 const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').pop(),one=request.headers().accept?.includes('vnd.pgrst.object');let data=[];
 if(url.pathname.includes('/auth/'))data=url.pathname.endsWith('/token')?session:{user};
 else if(table==='weddings')data=one?wedding:[wedding];
 else if(table==='recommendations')data=[{id:'recommendation-one',guest_name:'Guest Friend',message:'A wonderful place to visit together',category:'Adventure',status:'active',destination:{id:'destination-one',location_name:'Boston',latitude:42.36,longitude:-71.06}}];
 else if(table==='story_locations')data=[story];
 else if(table==='timeline_entries')data=memories;
 if(request.method()!=='GET')writes.push({table,method:request.method()});
 await route.fulfill({json:data});
});
await context.route('**/api/map-plan?**',route=>route.fulfill({json:{tier,access:true}}));
await context.route('**/api/map-timeline?**',route=>route.fulfill({json:{entries:[...memories.filter(entry=>wedding.event_metadata.include_guest_memories!==false||entry.category!=='Guest Memory'),{id:'story-story-one',date_value:story.event_date,sort_date:story.event_date,title:story.title,story:story.description,category:'Milestone',contributor_name:'Host',destination:{location_name:story.location_name,latitude:story.latitude,longitude:story.longitude}}]}}));
await context.route('**/api/account/orders',route=>route.fulfill({json:{email:user.email,orders:[],maps:[wedding],mapAccessOverride:'timeline-plus'}}));
await context.route('**/api/media?**',route=>route.fulfill({json:{assets:[]}}));
await context.route('**/api/maps/settings',async route=>{const body=route.request().postDataJSON();assert.equal(body.mapId,wedding.id);const{mapId,...patch}=body;wedding={...wedding,event_metadata:{...wedding.event_metadata,...patch}};await route.fulfill({json:{map:wedding}})});
await context.route('**/api/location-search?**',route=>route.fulfill({json:{places:[{id:'fixture-place',name:'Cincinnati, Ohio',lat:39.1,lng:-84.5,provider:'nominatim'}]}}));
await context.route('**/api/contribution',route=>{const body=route.request().postDataJSON();assert.equal(body.weddingId,wedding.id);return route.fulfill({json:{id:'new-place',destinationId:'new-destination',message:body.message,category:body.category}})});
await context.route('**/api/timeline-memory',route=>route.fulfill({json:{entry:{...memories[0],id:'new-memory'}}}));
await context.addInitScript(value=>localStorage.setItem('sb-kdcymeoldvwlmfwemfgq-auth-token',JSON.stringify(value)),session);
const go=path=>page.goto((process.env.QA_BASE_URL||'http://127.0.0.1:3000')+path,{waitUntil:'domcontentloaded'});

await context.route('**/api/maps/delete',async route=>{assert.equal(route.request().postDataJSON().confirmation,'DELETE');await route.fulfill({json:{ok:true}})});

wedding={...wedding,contribution_status:'open',contribution_closes_at:'2026-10-01T00:00:00Z'};
const saves=[];
await context.route('**/rest/v1/weddings?**',async route=>{if(route.request().method()==='PATCH'){const patch=route.request().postDataJSON();saves.push(patch);wedding={...wedding,...patch}}const one=route.request().headers().accept?.includes('vnd.pgrst.object');await route.fulfill({json:one?wedding:[wedding]})});
for(const width of [1360,390]){
 await page.setViewportSize({width,height:1000});wedding={...wedding,contribution_status:'open',contribution_closes_at:'2026-10-01T00:00:00Z'};
 await go('/dashboard');await page.getByRole('button',{name:'Wedding Details',exact:true}).click();const settings=page.locator('form.settings');
 await expect(settings.getByLabel('Submission status')).toHaveValue('scheduled');await expect(settings.getByText('The saved closing time has passed, so guests cannot contribute.',{exact:false})).toBeVisible();
 const time=settings.getByLabel('Closing date and time (America/New_York)',{exact:true});await expect(time).toHaveValue('2026-09-30T20:00');
 const before=saves.length;await settings.getByRole('button',{name:'Save changes',exact:true}).click();await expect(settings.getByText('The scheduled closing time has passed.',{exact:false})).toBeVisible();assert.equal(saves.length,before);
 await settings.getByLabel('Submission status').selectOption('open');await expect(time).toHaveCount(0);await settings.getByRole('button',{name:'Save changes',exact:true}).click();await expect(settings.getByText('Saved.',{exact:true})).toBeVisible();assert.equal(saves.at(-1).contribution_status,'open');assert.equal(saves.at(-1).contribution_closes_at,null);
 await page.reload();await page.getByRole('button',{name:'Wedding Details',exact:true}).click();await expect(settings.getByLabel('Submission status')).toHaveValue('open');
 await settings.getByLabel('Submission status').selectOption('scheduled');await time.fill('2027-10-18T00:00');await expect(time).toHaveValue('2027-10-18T00:00');await settings.getByRole('button',{name:'Save changes',exact:true}).click();await expect(settings.getByText('Saved.',{exact:true})).toBeVisible();assert.equal(saves.at(-1).contribution_closes_at,'2027-10-18T04:00:00.000Z');
 await page.reload();await page.getByRole('button',{name:'Wedding Details',exact:true}).click();await expect(time).toHaveValue('2027-10-18T00:00');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`outputs/qr-closure-investigation/settings-${width}.png`,fullPage:true});
}
assert.deepEqual(errors,[]);console.log('PASS desktop/mobile expired-status visibility, local timezone, no per-keystroke shifts, reopening clears deadline, saves persist after reload');await browser.close();
