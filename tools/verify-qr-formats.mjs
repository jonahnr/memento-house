import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='tools/verification-qr-formats';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
let tier='timeline-plus';
const user={id:'11111111-1111-4111-8111-111111111111',email:'preview@example.com',aud:'authenticated',role:'authenticated',user_metadata:{product_tier:tier}};
const wedding={id:'22222222-2222-4222-8222-222222222222',partner_one_name:'Alice',partner_two_name:'Sam',wedding_date:'2026-10-01',title:'Our Adventure Map',slug:'alice-sam',accent_color:'#b78338'};
await context.route('**/*.supabase.co/**',route=>{const u=new URL(route.request().url());return route.fulfill({json:u.pathname.includes('/auth/')?{user}:u.pathname.includes('/weddings')?wedding:[]})});
await context.route('**/api/map-plan?**',route=>route.fulfill({json:{tier,access:true}}));
await context.route('**/api/map-timeline?**',route=>route.fulfill({json:{entries:[]}}));
await context.route('**/api/account/orders',route=>route.fulfill({json:{orders:[]}}));
await context.addInitScript(user=>localStorage.setItem('sb-kdcymeoldvwlmfwemfgq-auth-token',JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),user);
await page.goto('http://127.0.0.1:3000/dashboard');await page.getByRole('button',{name:'QR Code',exact:true}).click();await page.getByRole('button',{name:'Print full-page sign ↓',exact:true}).waitFor();
await page.waitForFunction(()=>[...document.querySelectorAll('.qrCard img')].every(i=>i.complete&&i.naturalWidth>0));
const checks=[];
for(const layout of ['single','double','4x6','5x7'])for(const design of ['classic','garden','editorial']){
 await page.emulateMedia({media:'screen'});await page.getByLabel('Print layout').selectOption(layout);await page.getByLabel('Sign design').selectOption(design);
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${layout}/${design} mobile page overflow`);
 await page.locator('.qrPrintSheet').screenshot({path:`${out}/${layout}-${design}-mobile.png`});
 await page.setViewportSize({width:1440,height:1100});await page.emulateMedia({media:'print'});
 const cards=await page.locator('.qrCard').evaluateAll(els=>els.map(el=>{
  const r=el.getBoundingClientRect();
  return {x:r.x,y:r.y,width:r.width,height:r.height,scrollHeight:el.scrollHeight,scrollWidth:el.scrollWidth,
   children:[...el.children].map(c=>{const b=c.getBoundingClientRect();return {name:c.className,top:b.top,bottom:b.bottom,left:b.left,right:b.right}}),
   images:[...el.querySelectorAll('img')].map(i=>({name:i.className,ppi:i.naturalWidth/(i.getBoundingClientRect().width/96)}))};
 }));
 assert.equal(cards.length,layout==='double'?2:1);
 for(const card of cards){assert.ok(card.scrollHeight<=card.height+1,`${layout}/${design} vertical overflow`);assert.ok(card.scrollWidth<=card.width+1,`${layout}/${design} horizontal overflow`);for(const image of card.images)assert.ok(image.ppi>=300,`${layout}/${design} ${image.name} ${image.ppi} PPI`);for(const child of card.children)assert.ok(child.top>=card.y-1&&child.bottom<=card.y+card.height+1&&child.left>=card.x-1&&child.right<=card.x+card.width+1,`${layout}/${design} clipped ${child.name}`)}
 if(cards.length===2)assert.ok(cards[1].y>=cards[0].y+cards[0].height-1);
 await page.pdf({path:`${out}/${layout}-${design}.pdf`,preferCSSPageSize:true,printBackground:true});
 await page.locator('.qrPrintSheet').screenshot({path:`${out}/${layout}-${design}-print.png`});
 checks.push({layout,design,cards});
}
await page.emulateMedia({media:'screen'});tier='map-plus';await page.reload();await page.getByRole('button',{name:'QR Code',exact:true}).click();await page.locator('.realQr').waitFor();
for(const layout of ['single','double','4x6','5x7'])for(const design of ['classic','garden','editorial']){await page.getByLabel('Print layout').selectOption(layout);await page.getByLabel('Sign design').selectOption(design);assert.doesNotMatch(await page.locator('.qrInvitation').first().innerText(),/memory/)}
assert.deepEqual(errors,[]);await writeFile(`${out}/checks.json`,JSON.stringify(checks,null,2));console.log(JSON.stringify({passed:true,combinations:checks.length,minPpi:Math.min(...checks.flatMap(c=>c.cards.flatMap(card=>card.images.map(i=>i.ppi)))),errors}));await browser.close();
