import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='outputs/dashboard-revisions-qa';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1360,height:1000},acceptDownloads:true});
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
for(const width of [1360,390]){
 await page.setViewportSize({width,height:1000});await go('/dashboard');await page.locator('[data-tour-nav="Travel Journal"]').waitFor();
 assert.equal(await page.locator('[data-tour-nav="Recommendations"]').count(),0);
 await page.locator('[data-tour-nav="Travel Journal"]').click();assert.equal(await page.locator('#guest-recommendations').evaluate(el=>el.open),false);
 await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.locator('#guest-recommendations > summary').click();assert.equal(await page.locator('#guest-recommendations').evaluate(el=>el.open),true);await page.locator('#guest-recommendations').getByRole('button',{name:'Add to Want to Go'}).click();await expect(page.locator('.travelJournal')).toContainText('Originally recommended by Guest Friend');await expect(page.locator('.travelJournal')).toContainText('A wonderful place to visit together');await expect(page.locator('.manageRow').getByRole('button',{name:'Remove',exact:true})).toBeVisible();
 await page.locator('[data-tour-nav="Overview"]').click();assert.match(await page.locator('.readinessProgress').innerText(),/60%|80%/);
 await page.getByRole('listitem').filter({hasText:'Review How to Get More Guests to Participate'}).getByRole('button').click();
 await page.locator('.participationGuide img').waitFor();await page.locator('.participationGuide').scrollIntoViewIfNeeded();await page.waitForTimeout(500);assert.equal(wedding.event_metadata.participation_guide_reviewed,true);
 await page.screenshot({path:`${out}/optimize-${width}.png`,fullPage:true});await page.getByRole('button',{name:'Start Guided Walkthrough'}).click();
 const titles=['Overview','Our Chronological Story','Travel Journal','QR Code','Optimize','Keepsake','Wedding Details','My Account'];
 for(const [index,title]of titles.entries()){
  assert.equal(await page.locator('.dashboardTour h2').innerText(),title);
  if(index===2){await page.locator('.dashboardTour').getByRole('button',{name:'Back',exact:true}).click();assert.equal(await page.locator('.dashboardTour h2').innerText(),titles[1]);await page.locator('.dashboardTour').getByRole('button',{name:'Next'}).click()}
  await page.locator('.dashboardTour').getByRole('button',{name:'Next'}).click();
 }
 assert.match(await page.locator('.dashboardTour').innerText(),/finished the tour/);await page.locator('.dashboardTour').getByRole('button',{name:'Finish',exact:true}).click();
 await page.locator('[data-tour-nav="Our Story"]').click();await page.getByLabel('Include “Guest memory” in Chronological Story').click();await expect(page.getByLabel('Include “Guest memory” in Chronological Story')).not.toBeChecked();assert.deepEqual(wedding.event_metadata.excluded_story_memory_ids,['memory-one']);await page.reload();await page.locator('[data-tour-nav="Our Story"]').click();assert.equal(await page.getByLabel('Include “Guest memory” in Chronological Story').isChecked(),false);await page.getByLabel('Include “Guest memory” in Chronological Story').click();await expect(page.getByLabel('Include “Guest memory” in Chronological Story')).toBeChecked();
 await go('/dashboard?section=Recommendations');await page.locator('#guest-recommendations').waitFor();assert.equal(await page.locator('#guest-recommendations').evaluate(el=>el.open),true);
 await page.screenshot({path:`${out}/travel-${width}.png`,fullPage:true});
 await go('/account');await page.getByRole('button',{name:'Delete experience',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Delete experience',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Delete Permanently',exact:true}).isEnabled(),false);await page.getByLabel('Type DELETE to confirm').fill('delete');assert.equal(await page.getByRole('button',{name:'Delete Permanently',exact:true}).isEnabled(),false);await page.getByLabel('Type DELETE to confirm').fill('DELETE');await page.getByRole('button',{name:'Delete Permanently',exact:true}).click();await page.getByRole('heading',{name:'No digital experiences yet'}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
assert.deepEqual(errors,[]);console.log('PASS desktop/mobile navigation, guide persistence, tour, memory exclusion, legacy link, two-stage deletion');await browser.close();
