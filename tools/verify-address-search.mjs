import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});const context=await browser.newContext(),page=await context.newPage();
const user={id:'11111111-1111-4111-8111-111111111111',email:'preview@example.com',aud:'authenticated',role:'authenticated',user_metadata:{product_tier:'timeline-plus'}};
const wedding={id:'22222222-2222-4222-8222-222222222222',partner_one_name:'Alice',partner_two_name:'Sam',wedding_date:'2026-10-01',title:'Our Adventure Map',slug:'alice-sam',accent_color:'#b78338'};
const existing={id:'existing-story',title:'Our first date',description:'Keep this address',story_type:'First Date',location_name:'Paris, France',latitude:48.85,longitude:2.35,sort_order:0};let saved;
const examples=[
 {input:'5331 Rex',id:'rexford',name:'5331 Rexford Court, Montgomery, AL 36116, USA',lat:32.312,lng:-86.214},
 {input:'8642 Yule',id:'yule',name:'8642 Yule Street, Arvada, CO 80007, USA',lat:39.851,lng:-105.086},
 {input:'1693 Alice',id:'alice',name:'1693 Alice Court, Annapolis, MD 21401, USA',lat:38.994,lng:-76.555}
];
await context.route('**/*.supabase.co/**',route=>{const u=new URL(route.request().url());let data=[];if(u.pathname.includes('/auth/'))data={user};else if(u.pathname.includes('/weddings'))data=wedding;else if(u.pathname.includes('/story_locations')){if(route.request().method()==='POST'){saved={id:'new-address',...route.request().postDataJSON()};data=saved}else{assert.equal(route.request().method(),'GET');data=[existing]}}return route.fulfill({json:data})});
await context.route('**/api/map-plan?**',route=>route.fulfill({json:{tier:'timeline-plus',access:true}}));
await context.route('**/api/map-timeline?**',route=>route.fulfill({json:{entries:[]}}));
await context.route('**/api/account/orders',route=>route.fulfill({json:{orders:[]}}));
await context.route('**/api/location-search?**',route=>{const url=new URL(route.request().url()),placeId=url.searchParams.get('placeId');if(placeId){const item=examples.find(example=>example.id===placeId);assert.ok(item);return route.fulfill({json:{place:{id:`google-${item.id}`,name:item.name,lat:item.lat,lng:item.lng,provider:'google'}}})}const query=url.searchParams.get('q'),item=examples.find(example=>example.input===query);assert.ok(item);assert.match(url.searchParams.get('session'),/^[\w-]{10,}$/);return route.fulfill({json:{provider:'google',places:[{id:`google-${item.id}`,name:item.name,provider:'google'}]}})});
await context.addInitScript(user=>localStorage.setItem('sb-kdcymeoldvwlmfwemfgq-auth-token',JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),user);
await page.goto('http://127.0.0.1:3000/dashboard');await page.getByRole('button',{name:'Our Story',exact:true}).click();
await page.getByLabel('Milestone title').fill('Our home');await page.getByLabel('Your story',{exact:true}).fill('A place in our story.');
const search=page.getByRole('textbox',{name:'Search for a real address or location'});
for(const item of examples){await search.fill(item.input);const option=page.getByRole('button',{name:new RegExp(item.name)});await option.waitFor();assert.match(await option.innerText(),/Google Maps address/);assert.equal(await page.getByLabel('Results provided by Google Maps').count(),1);await option.click();await page.waitForFunction(expected=>document.querySelector('input[aria-label="Search for a real address or location"]')?.value===expected,item.name)}
await page.getByRole('button',{name:'Add milestone',exact:true}).click();await page.locator('.storyList').getByText('Our home',{exact:true}).waitFor();
assert.equal(saved.latitude,examples[2].lat);assert.equal(saved.longitude,examples[2].lng);await page.locator('.storyList').getByText('Paris, France',{exact:true}).waitFor();
await page.screenshot({path:'tools/verification-qr-formats/address-selected.png',fullPage:true});
await writeFile('tools/verification-qr-formats/address-check.json',JSON.stringify({googleAutocompleteExamples:examples.map(example=>example.name),saved,existingPreserved:true},null,2));console.log('Google autocomplete, selection, attribution, and additive milestone save passed for all three reported addresses. Existing Paris address preserved.');await browser.close();
