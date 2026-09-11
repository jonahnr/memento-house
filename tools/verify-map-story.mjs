import {chromium,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({headless:true});
mkdirSync('outputs/map-story',{recursive:true});
try {
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const entries=Array.from({length:12},(_,i)=>({id:`memory-${i}`,date_value:`2024-${String(i+1).padStart(2,'0')}-01`,sort_date:`2024-${String(i+1).padStart(2,'0')}-01`,title:i===3?'A wonderfully long chapter title about all the places and people we will always remember together':'Our memory '+(i+1),category:'Adventure',story:'A favorite memory from our travels together, kept with the people and places we love.',photo:{public_url:'/brand/our-story-door.jpg',alt_text:'A memory'},destination:{location_name:i===3?'A very long location name in a beautiful neighborhood, Cincinnati, Ohio, United States of America':'Cincinnati, Ohio',latitude:35+i*.8,longitude:-110+i*2}}));
await page.route('**/*.supabase.co/**',route=>{const url=route.request().url();return route.fulfill({json:url.includes('/weddings')?{id:'fixture',partner_one_name:'Jonah',partner_two_name:'Kate',wedding_date:'2026-08-29',title:'Our Adventure Map',slug:'test-story',welcome_message:'The places and memories we keep.'}:[]})});
await page.route('**/api/map-plan?**',route=>route.fulfill({json:{tier:'timeline-plus',venue:{location_name:'Cincinnati',latitude:39,longitude:-84}}}));
await page.route('**/api/map-timeline?**',route=>route.fulfill({json:{entries}}));
await page.goto('http://127.0.0.1:3000/map/test-story');await page.locator('.storyMemory').first().waitFor({state:'attached'});
const results=[];
for(const [width,height] of [[1920,1080],[1440,900],[1280,800],[1024,768],[768,1024],[430,932],[390,844],[375,812],[844,390],[667,375]]){
await page.setViewportSize({width,height});await page.waitForTimeout(350);
if(width<960&&await page.locator('.storyToggle').getAttribute('aria-expanded')==='false')await page.locator('.storyToggle').click();
await page.locator('.storyMemory').nth(3).click();await expect(page.locator('.storyMemory').nth(3)).toHaveAttribute('aria-pressed','true');
await expect(page.locator('.timelineMarkerActive')).toHaveCount(1);
const size=await page.evaluate(()=>{const map=document.querySelector('.realMap'),canvas=map.querySelector('canvas'),pane=document.querySelector('.storyPaneScroll');return {overflow:document.documentElement.scrollWidth>innerWidth,mapWidth:map.clientWidth,canvasWidth:canvas.clientWidth,mapHeight:map.clientHeight,scrollable:pane.scrollHeight>pane.clientHeight}});
expect(size.overflow).toBe(false);expect(Math.abs(size.mapWidth-size.canvasWidth)).toBeLessThan(2);expect(size.mapHeight).toBeGreaterThanOrEqual(300);expect(size.scrollable).toBe(true);
await page.getByRole('button',{name:'Fit all pins',exact:true}).click();await page.waitForTimeout(800);
await page.locator('.geoMarker.storyGeo').last().click();await expect(page.locator('.storyMemory').last()).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(500);
const paneOnly=await page.evaluate(()=>{const pane=document.querySelector('.storyPaneScroll'),card=pane.querySelector('[aria-pressed="true"]');return {scroll:pane.scrollTop,visible:card.getBoundingClientRect().top>=pane.getBoundingClientRect().top-2}});expect(paneOnly.scroll).toBeGreaterThan(0);expect(paneOnly.visible).toBe(true);
await page.locator('.mapStoryLayout').screenshot({path:`outputs/map-story/${width}x${height}.png`});results.push({width,height,...size});
}
await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(page.locator('.storyMemory')).toHaveCount(0);await expect(page.locator('.timelineMarkerActive')).toHaveCount(0);await page.getByRole('button',{name:'Select all',exact:true}).click();await expect(page.locator('.storyMemory')).toHaveCount(12);
await page.getByRole('button',{name:'▶ Play our story',exact:true}).click();await expect(page.locator('.storyMemory').first()).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(3700);await expect(page.locator('.storyMemory').nth(1)).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Pause story',exact:true}).click();
expect(errors).toEqual([]);console.log(JSON.stringify({passed:true,results,errors},null,2));
} finally {await browser.close()}
