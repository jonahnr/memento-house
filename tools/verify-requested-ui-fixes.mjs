import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();const page=await browser.newPage();
for(const width of [320,390,700]){
 await page.setViewportSize({width,height:844});
 for(const path of ['/memento-map','/memento-map/wedding','/memento-deck','/unity-tile-signature-board','/our-story','/celebrations/wedding']){
  console.log(width,path);await page.goto('http://127.0.0.1:3000'+path,{waitUntil:'domcontentloaded'});
  const link=page.locator('.mobileAccountAccess a[href="/login"]');await link.waitFor({state:'visible'});
  const box=await link.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width,`${path} ${width} account offscreen`);
 }
}
await page.setViewportSize({width:1280,height:900});await page.goto('http://127.0.0.1:3000');
const text=page.locator('#celebrations .experienceSelect b').first();await text.click();await page.waitForURL('**/celebrations/wedding');
await page.goto('http://127.0.0.1:3000');const next=page.locator('#celebrations .experienceSelect b').nth(1);await next.click();await page.waitForTimeout(600);await next.click();await page.waitForURL('**/celebrations/anniversary');
await page.route('**/*.supabase.co/**',route=>route.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',user_metadata:{}}}}));
await page.route('**/api/account/orders',route=>route.fulfill({json:{orders:[]}}));
await page.addInitScript(()=>localStorage.setItem('sb-kdcymeoldvwlmfwemfgq-auth-token',JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'11111111-1111-4111-8111-111111111111',user_metadata:{}}})));
await page.setViewportSize({width:390,height:844});
for(const path of ['/memento-map','/memento-deck']){await page.goto('http://127.0.0.1:3000'+path);await page.locator('.mobileAccountAccess a[href="/account"]').waitFor({state:'visible'});}
console.log('Passed: account links at 320/390/700px on six pages; selected and unselected celebration text navigation.');await browser.close();
