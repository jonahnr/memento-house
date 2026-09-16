import {chromium,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({headless:true});
mkdirSync('outputs/story-redesign',{recursive:true});
try {
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const entries=Array.from({length:12},(_,i)=>({id:`memory-${i}`,date_value:`2024-${String(i+1).padStart(2,'0')}-01`,sort_date:`2024-${String(i+1).padStart(2,'0')}-01`,title:i===3?'A wonderfully long chapter title about all the places and people we will always remember together':'Our memory '+(i+1),category:'Adventure',contributor_name:'Avery & Jordan',story:('A favorite memory from our travels together, kept with the people and places we love. ').repeat(8),photo:i===11?null:{public_url:'/brand/our-story-door.jpg',alt_text:'A memory'},media:i===11?[{id:'video-only',media_type:'video',status:'ready',cloudflare_uid:'fixture-video',thumbnail_url:'/brand/our-story-door.jpg'}]:[],destination:{location_name:i===3?'123 Main Street, Cincinnati, OH 45202, United States of America':'Cincinnati, Ohio',latitude:35+i*.8,longitude:-110+i*2}}));
const recs=['Guest Origin','Food','Our Story','Adventure','Beach','Culture','City Trip','Travel'].map((category,i)=>({id:`rec-${i}`,guest_name:'A guest',message:'A favorite place to share.',category,destination_id:`dest-${i}`,destination:{location_name:`Place ${i}`,latitude:34+i,longitude:-105+i}}));
await page.route('**/*.supabase.co/**',route=>{const url=route.request().url();return route.fulfill({json:url.includes('/weddings')?{id:'fixture',partner_one_name:'Jonah',partner_two_name:'Kate',wedding_date:'2026-08-29',title:'Our Adventure Map',slug:'test-story',welcome_message:'The places and memories we keep.'}:url.includes('/recommendations')?recs:url.includes('/couple_destination_status')?[{destination_id:'dest-3',status:'want_to_go'},{destination_id:'dest-4',status:'visited'}]:[]})});
await page.route('**/api/map-plan?**',route=>route.fulfill({json:{tier:'timeline-plus',venue:{location_name:'Cincinnati',latitude:39,longitude:-84}}}));
await page.route('**/api/map-timeline?**',route=>route.fulfill({json:{entries}}));
await page.goto(`${process.env.MAP_TEST_BASE||'http://127.0.0.1:3000'}/map/test-story`);await page.locator('.storyMemory').first().waitFor({state:'attached'});

const results=[];
for(const width of [1440,1024,768,390,320]){
 await page.setViewportSize({width,height:1000});
 const card=page.locator('.storyMemory').nth(3),button=card.locator('.storyMemoryCard');
 await card.scrollIntoViewIfNeeded();
 await expect(button).toHaveAttribute('aria-expanded','false');
 await expect(card.locator('.storySharedBy')).toHaveText('Shared by Avery & Jordan');
 await expect(card.locator('.storyDate time')).toBeVisible();
 const collapsed=await card.boundingBox();
 const geometry=await card.evaluate(node=>{const photo=node.querySelector('.storyPhoto').getBoundingClientRect(),text=node.querySelector('.storyMemoryCard').getBoundingClientRect(),date=node.querySelector('.storyDate').getBoundingClientRect(),title=node.querySelector('small span');return {photoRight:photo.right,textLeft:text.left,dateLeft:date.left,photoLeft:photo.left,titleHeight:title.clientHeight,titleLine:parseFloat(getComputedStyle(title).lineHeight),overflow:document.documentElement.scrollWidth>innerWidth}});
 expect(geometry.photoRight).toBeLessThanOrEqual(geometry.textLeft+1);expect(geometry.overflow).toBe(false);
 if(width<=959){expect(Math.abs(geometry.dateLeft-geometry.photoLeft)).toBeLessThan(2);expect(geometry.titleHeight).toBeGreaterThan(geometry.titleLine)}
 await card.screenshot({path:`outputs/story-redesign/${width}-collapsed.png`});
 for(let i=0;i<3;i++){
  await button.click();await expect(button).toHaveAttribute('aria-expanded','true');
  const expanded=await card.boundingBox();expect(expanded.height).toBeGreaterThan(collapsed.height);
  await expect(card.locator('.loveMiles')).toBeVisible();
  expect(await card.locator('.storyDescription').evaluate(n=>n.scrollHeight<=n.clientHeight+1)).toBe(true);
  if(width<=959){const layout=await card.evaluate(n=>{const date=n.querySelector('.storyDate').getBoundingClientRect(),photo=n.querySelector('.storyPhoto').getBoundingClientRect(),icon=n.querySelector('.storySharedBy svg').getBoundingClientRect(),name=n.querySelector('.storySharedBy span').getBoundingClientRect();return {gap:photo.top-date.bottom,inline:icon.right<=name.left}});expect(layout.gap).toBeLessThan(5);expect(layout.inline).toBe(true)}
  if(i===0)await card.screenshot({path:`outputs/story-redesign/${width}-expanded.png`});
  await button.click();await expect(button).toHaveAttribute('aria-expanded','false');
 }
 await button.focus();await page.keyboard.press('Enter');await expect(button).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Space');await expect(button).toHaveAttribute('aria-expanded','false');
 await card.locator('.storySharedBy').click();await expect(button).toHaveAttribute('aria-expanded','true');await button.click();
 await card.locator('.storyPhotoButton').click();await expect(button).toHaveAttribute('aria-expanded','false');await expect(card.locator('.storySharedBy')).toBeVisible();await card.locator('.storyPhotoButton').click();
 results.push({width,collapsedHeight:collapsed.height,...geometry});
}
await expect(page.locator('.storyMemoryBack,.storyCardInner')).toHaveCount(0);
await expect(page.locator('.storyVideoSlot').getByRole('button',{name:/play video/i})).toBeVisible();
await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(page.locator('.storyMemory')).toHaveCount(0);await page.getByRole('button',{name:'Select all',exact:true}).click();await expect(page.locator('.storyMemory')).toHaveCount(12);
await page.getByRole('button',{name:'▶ Play our story',exact:true}).click();await expect(page.getByRole('button',{name:'Pause story',exact:true})).toBeVisible();await page.getByRole('button',{name:'Pause story',exact:true}).click();
for(const route of ['/','/memento-map'])for(const width of [1440,390]){
 await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:3000'+route);
 const section=page.locator('.experienceSelector');await section.scrollIntoViewIfNeeded();
 await expect(section).not.toContainText('Available now');
 const target=section.locator('.experienceOption').nth(2),link=target.locator('a');
 await link.click();await expect(target).toHaveClass(/selected/);expect(new URL(page.url()).pathname).toBe(route);
 await page.waitForTimeout(700);await expect(target).toHaveClass(/selected/);
 await section.screenshot({path:`outputs/story-redesign/carousel-${route==='/'?'home':'map'}-${width}.png`});
 const href=await link.getAttribute('href');await link.click();await expect(page).toHaveURL(new RegExp(href+'$'));
}
expect(errors).toEqual([]);console.log(JSON.stringify({passed:true,results,errors},null,2));
}finally{await browser.close()}
