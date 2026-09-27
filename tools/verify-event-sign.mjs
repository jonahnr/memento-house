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

const checks=[];
for(const mapType of ['wedding','family_reunion','celebration_of_life'])for(const plan of ['map','timeline-plus']){
 wedding={...wedding,map_type:mapType,title:mapType==='wedding'?'Our Adventure Map':mapType==='family_reunion'?'The Robinson Family Reunion':'Remembering Alex'};tier=plan;
 await go('/dashboard');await page.getByRole('button',{name:'QR Code',exact:true}).click();await page.getByRole('button',{name:'Download print-ready PDF',exact:true}).waitFor();
 await page.waitForFunction(()=>!document.querySelector('.qrTools .button.gold')?.disabled);await page.addScriptTag({path:'node_modules/jsqr/dist/jsQR.js'});
 for(const layout of ['single','double','4x6','5x7']){
  await page.getByLabel('Print layout').selectOption(layout);await page.waitForFunction(()=>!document.querySelector('.qrTools .button.gold')?.disabled);
  const data=await page.locator('.eventSignPrint img').getAttribute('src');const png=Buffer.from(data.split(',')[1],'base64');const size=layout==='4x6'?[1200,1800]:layout==='5x7'?[1500,2100]:[2550,3300];assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],size);
  const decoded=await page.locator('.eventSignPrint img').evaluate((img,layout)=>{
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=img.naturalWidth;canvas.height=layout==='double'?img.naturalHeight/2:img.naturalHeight;
   return Array.from({length:layout==='double'?2:1},(_,index)=>{ctx.drawImage(img,0,index*canvas.height,canvas.width,canvas.height,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);return window.jsQR(pixels.data,canvas.width,canvas.height)?.data});
  },layout);for(const url of decoded){assert.ok(url,`${mapType}/${plan}/${layout} QR decode`);assert.equal(new URL(url).searchParams.get('source'),'qr')}
  const alt=await page.locator('.eventSignPrint img').getAttribute('alt');assert.equal(alt.includes('Next, share a memory'),plan==='timeline-plus');if(mapType!=='wedding')assert.ok(!alt.includes('Jonah'));
  if(mapType==='wedding'&&plan==='timeline-plus'){
   await writeFile(`${out}/sign-${layout}.png`,png);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download print-ready PDF',exact:true}).click();const download=await pending;await download.saveAs(`${out}/sign-${layout}.pdf`);const pdf=await readFile(`${out}/sign-${layout}.pdf`),points=layout==='4x6'?[288,432]:layout==='5x7'?[360,504]:[612,792];assert.ok(pdf.toString('latin1').includes(`/MediaBox [0 0 ${points[0]} ${points[1]}]`));
   const imageStart=pdf.indexOf(Buffer.from('stream\n'),pdf.indexOf(Buffer.from('/Subtype /Image')))+7,imageEnd=pdf.indexOf(Buffer.from('\nendstream'),imageStart),jpeg=pdf.subarray(imageStart,imageEnd).toString('base64');
   const pdfDecoded=await page.evaluate(async({jpeg,layout})=>{const img=new Image();img.src='data:image/jpeg;base64,'+jpeg;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=layout==='double'?img.naturalHeight/2:img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,img.naturalWidth,c.height,0,0,c.width,c.height);const pixels=ctx.getImageData(0,0,c.width,c.height);return window.jsQR(pixels.data,c.width,c.height)?.data},{jpeg,layout});assert.ok(pdfDecoded,`${layout} PDF QR decode`);
   const pngPending=page.waitForEvent('download');await page.getByRole('button',{name:'Download 300 PPI PNG',exact:true}).click();const pngDownload=await pngPending;await pngDownload.saveAs(`${out}/sign-${layout}-300ppi.png`);const exportedPng=await readFile(`${out}/sign-${layout}-300ppi.png`),phys=exportedPng.indexOf(Buffer.from('pHYs'));assert.equal(exportedPng.readUInt32BE(phys+4),11811);assert.equal(exportedPng.readUInt32BE(phys+8),11811);

   await page.setViewportSize({width:390,height:844});await page.locator('.eventSignLayout').screenshot({path:`${out}/sign-${layout}-mobile.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.eventSignPrint img').getAttribute('src'),data);await page.setViewportSize({width:1360,height:1000});
  }
  checks.push({mapType,plan,layout,size,qr:decoded.length});
 }
 console.log(`PASS: signs for ${mapType}/${plan}, all four sizes and QR decode`);
}
await page.getByLabel('Print layout').selectOption('single');
for(const design of ['classic','garden','editorial','lavender-sage','botanical-frame','rose-ribbon','midnight-gold','coastal-blue','terracotta-arch','champagne-lines']){
 await page.getByLabel('Sign design').selectOption(design);await page.waitForFunction(()=>!document.querySelector('.qrTools .button.gold')?.disabled);
 const decoded=await page.locator('.eventSignPrint img').evaluate(img=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height);return window.jsQR(pixels.data,c.width,c.height)?.data});assert.ok(decoded,design);
}
await writeFile(out+'/sign-results.json',JSON.stringify({checks,errors},null,2));assert.deepEqual(errors,[]);console.log('PASS: sign exports, exact PDF dimensions, all ten palettes, mobile preview invariance');await browser.close();
