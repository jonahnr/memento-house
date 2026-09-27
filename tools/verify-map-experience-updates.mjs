import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='outputs/map-experience-qa';await mkdir(out,{recursive:true});
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
 else if(table==='story_locations')data=[story];
 else if(table==='timeline_entries')data=memories;
 if(request.method()!=='GET')writes.push({table,method:request.method()});
 await route.fulfill({json:data});
});
await context.route('**/api/map-plan?**',route=>route.fulfill({json:{tier,access:true}}));
await context.route('**/api/map-timeline?**',route=>route.fulfill({json:{entries:[...memories.filter(entry=>wedding.event_metadata.include_guest_memories!==false||entry.category!=='Guest Memory'),{id:'story-story-one',date_value:story.event_date,sort_date:story.event_date,title:story.title,story:story.description,category:'Milestone',contributor_name:'Host',destination:{location_name:story.location_name,latitude:story.latitude,longitude:story.longitude}}]}}));
await context.route('**/api/account/orders',route=>route.fulfill({json:{orders:[]}}));
await context.route('**/api/media?**',route=>route.fulfill({json:{assets:[]}}));
await context.route('**/api/maps/settings',async route=>{const body=route.request().postDataJSON();assert.equal(body.mapId,wedding.id);const{mapId,...patch}=body;wedding={...wedding,event_metadata:{...wedding.event_metadata,...patch}};await route.fulfill({json:{map:wedding}})});
await context.route('**/api/location-search?**',route=>route.fulfill({json:{places:[{id:'fixture-place',name:'Cincinnati, Ohio',lat:39.1,lng:-84.5,provider:'nominatim'}]}}));
await context.route('**/api/contribution',route=>{const body=route.request().postDataJSON();assert.equal(body.weddingId,wedding.id);return route.fulfill({json:{id:'new-place',destinationId:'new-destination',message:body.message,category:body.category}})});
await context.route('**/api/timeline-memory',route=>route.fulfill({json:{entry:{...memories[0],id:'new-memory'}}}));
await context.addInitScript(value=>localStorage.setItem('sb-kdcymeoldvwlmfwemfgq-auth-token',JSON.stringify(value)),session);
const go=path=>page.goto('http://127.0.0.1:3000'+path,{waitUntil:'domcontentloaded'});
const categories=[['Wedding','wedding',null],['Family Reunion','family-reunion',null],['Celebration of Life','celebration-of-life',null],['Next Chapter','next-chapter',null],['Events & Communities','events',null],['Anniversary','wedding','anniversary']];
for(const [index,selectedTier] of ['map','plus','timeline-plus'].entries()){
 console.log('Pricing',selectedTier);await go('/memento-map');await page.waitForTimeout(800);await page.locator('#pricing .priceCardOverview .button.gold').nth(index).click();await page.locator('dialog[open]').waitFor();
 assert.match(await page.locator('dialog').innerText(),/What are you creating/);
 for(const [name,type,occasion]of categories){const href=await page.locator('dialog').getByRole('link',{name:name+' →',exact:true}).getAttribute('href'),url=new URL(href,'https://local');assert.equal(url.searchParams.get('tier'),selectedTier);assert.equal(url.searchParams.get('type'),type);assert.equal(url.searchParams.get('occasion'),occasion)}
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(el=>el.open),false);
 await page.locator('#pricing .priceCardOverview .button.gold').nth(index).click();await page.locator('dialog').getByRole('link',{name:'Anniversary →',exact:true}).click();await page.waitForURL(/order/);assert.equal(await page.locator('input[name="tier"]').inputValue(),selectedTier);assert.equal(await page.locator('input[name="mapType"]').inputValue(),'wedding');assert.equal(await page.locator('input[name="mapOccasion"]').inputValue(),'anniversary');
}
console.log('PASS: all 18 tier/category links and existing order entry.');
for(const plan of ['map','timeline-plus'])for(const width of [1360,390]){
 tier=plan;await page.setViewportSize({width,height:1000});await go('/map/qa-event');await page.locator('.weddingPage').waitFor();assert.equal(await page.getByRole('dialog').count(),0);
 await go('/map/qa-event?utm_source=event_qr');await page.locator('.weddingPage').waitFor();assert.equal(await page.getByRole('dialog').count(),0);
 await go('/map/qa-event?source=qr&utm_source=event_qr&utm_medium=print');await page.getByRole('dialog').waitFor();await page.getByRole('heading',{name:'Where did you travel from?',exact:true}).waitFor();
 if(width===390){const choices=await page.locator('.contributionChoice button').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect()));assert.ok(Math.abs(choices[0].top-choices[1].top)<3,'mobile contribution choices stay side by side')}
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await go('/map/qa-event?source=qr');const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.getByLabel('Search for a real address or location').fill('Cincinnati');await dialog.getByRole('button',{name:/Cincinnati, Ohio/}).click();await dialog.getByLabel('Your name',{exact:true}).fill('QA Guest');await dialog.getByRole('button',{name:'Add to the map →',exact:true}).click();await dialog.getByRole('button',{name:'Next',exact:true}).click();
 if(plan==='timeline-plus'){
  const memory=page.locator('.memoryModal');await memory.waitFor();if(width===390){await memory.getByRole('button',{name:'Skip and return to map',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0);await page.getByRole('button',{name:'♡ Add a Memory',exact:true}).click();await memory.waitFor();}await memory.getByLabel('Memory title').fill('A wonderful trip');await memory.getByLabel('When did it happen?').fill('2024-01-01');await memory.getByLabel('Search for a real address or location').fill('Cincinnati');await memory.getByRole('button',{name:/Cincinnati, Ohio/}).click();await memory.getByLabel('Tell the story').fill('An unforgettable day with friends.');await memory.getByLabel('Your name',{exact:true}).fill('QA Guest');await memory.getByRole('button',{name:'Add memory →',exact:true}).click();await memory.getByRole('button',{name:'Return to the map',exact:true}).click();
 }
 assert.equal(await page.getByRole('dialog').count(),0);const events=await page.evaluate(()=>Array.from(window.dataLayer||[]).map(item=>Array.from(item)).filter(item=>item[0]==='event').map(item=>item[1]));assert.ok(events.includes('guest_place_complete'));if(plan==='timeline-plus')assert.ok(events.includes('guest_memory_complete'));
}
console.log('PASS: QR vs shared/UTM-only visits, place + memory, desktop/mobile and dismiss.');
tier='timeline-plus';await page.setViewportSize({width:1360,height:1000});
for(const theme of ['classic','editorial','modern','romantic','timeless']){
 await go('/dashboard');await page.getByRole('button',{name:'Wedding Details',exact:true}).click();await page.locator(`input[name="typography"][value="${theme}"]`).check();await page.getByRole('button',{name:'Save typography',exact:true}).click();await page.getByText('Guest Map typography saved.').waitFor();assert.equal(wedding.event_metadata.organization_name,'Preserve this');
 await page.reload();await page.getByRole('button',{name:'Wedding Details',exact:true}).click();assert.ok(await page.locator(`input[name="typography"][value="${theme}"]`).isChecked());
 for(const width of [1360,390]){await page.setViewportSize({width,height:1000});await go('/map/qa-event');await page.locator(`.weddingPage[data-typography="${theme}"]`).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
}
console.log('PASS: five typography themes persist per map and render on desktop/mobile.');
await page.setViewportSize({width:1360,height:1000});await go('/dashboard');assert.equal(await page.getByRole('button',{name:'Timeline Plus',exact:true}).count(),0);await page.getByRole('button',{name:'Our chronological story',exact:true}).click();
await page.locator('.storyList').getByText('Guest memory',{exact:true}).waitFor();assert.deepEqual(await page.locator('.storyList>article b').allTextContents(),['Guest memory','Owner chapter','Legacy owner timeline chapter']);
await page.getByLabel('Include Guest Memories').click();await page.getByText('Guest memories hidden. All records are preserved.').waitFor();assert.equal(await page.locator('.storyList').getByText('Guest memory',{exact:true}).count(),0);await page.locator('.storyList').getByText('Owner chapter',{exact:true}).waitFor();await page.locator('.storyList').getByText('Legacy owner timeline chapter',{exact:true}).waitFor();
await page.reload();await page.getByRole('button',{name:'Our chronological story',exact:true}).click();assert.equal(await page.getByLabel('Include Guest Memories').isChecked(),false);await page.getByLabel('Include Guest Memories').click();await page.locator('.storyList').getByText('Guest memory',{exact:true}).waitFor();assert.ok(!writes.some(write=>['timeline_entries','story_locations'].includes(write.table)));
tier='plus';await go('/dashboard');await page.getByRole('button',{name:'Our chronological story',exact:true}).click();assert.equal(await page.getByLabel('Include Guest Memories').count(),0);
console.log('PASS: chronological merge, hide/restore/persist, manual + legacy records, eligibility.');
await writeFile(out+'/browser-results.json',JSON.stringify({errors,passed:true},null,2));assert.deepEqual(errors,[]);await browser.close();
