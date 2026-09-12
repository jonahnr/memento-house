import {chromium,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({headless:true});
mkdirSync('outputs/map-story',{recursive:true});
try {
const page=await browser.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const entries=Array.from({length:12},(_,i)=>({id:`memory-${i}`,date_value:`2024-${String(i+1).padStart(2,'0')}-01`,sort_date:`2024-${String(i+1).padStart(2,'0')}-01`,title:i===3?'A wonderfully long chapter title about all the places and people we will always remember together':'Our memory '+(i+1),category:'Adventure',story:'A favorite memory from our travels together, kept with the people and places we love.',photo:{public_url:'/brand/our-story-door.jpg',alt_text:'A memory'},destination:{location_name:i===3?'A very long location name in a beautiful neighborhood, Cincinnati, Ohio, United States of America':'Cincinnati, Ohio',latitude:35+i*.8,longitude:-110+i*2}}));
const recs=['Guest Origin','Food','Our Story','Adventure','Beach','Culture','City Trip','Travel'].map((category,i)=>({id:`rec-${i}`,guest_name:'A guest',message:'A favorite place to share.',category,destination_id:`dest-${i}`,destination:{location_name:`Place ${i}`,latitude:34+i,longitude:-105+i}}));
await page.route('**/*.supabase.co/**',route=>{const url=route.request().url();return route.fulfill({json:url.includes('/weddings')?{id:'fixture',partner_one_name:'Jonah',partner_two_name:'Kate',wedding_date:'2026-08-29',title:'Our Adventure Map',slug:'test-story',welcome_message:'The places and memories we keep.'}:url.includes('/recommendations')?recs:url.includes('/couple_destination_status')?[{destination_id:'dest-3',status:'want_to_go'},{destination_id:'dest-4',status:'visited'}]:[]})});
await page.route('**/api/map-plan?**',route=>route.fulfill({json:{tier:'timeline-plus',venue:{location_name:'Cincinnati',latitude:39,longitude:-84}}}));
await page.route('**/api/map-timeline?**',route=>route.fulfill({json:{entries}}));
await page.goto(`${process.env.MAP_TEST_BASE||'http://127.0.0.1:3000'}/map/test-story`);await page.locator('.storyMemory').first().waitFor({state:'attached'});
const buttons=await page.locator('.mapContributionActions button').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));expect(buttons[1].x-buttons[0].right).toBeGreaterThanOrEqual(10);
await expect(page.locator('.originGeo svg[data-icon="home"]')).toHaveCount(1);
await expect(page.locator('.recCard').filter({hasText:'Place 3'}).locator('.bucketStatus')).toHaveText('⚑ Want to go');
await expect(page.locator('.recCard').filter({hasText:'Place 4'}).locator('.bucketStatus')).toHaveText('✓ Completed');
await expect(page.locator('.recommendationGeo svg[data-icon="food"]')).toHaveCount(1);
await expect(page.locator('.recommendationGeo svg[data-icon="memory"]')).toHaveCount(1);
const color=await page.locator('.recommendationGeo').first().evaluate(el=>getComputedStyle(el).backgroundColor);expect(color).toBe('rgb(85, 127, 165)');
const results=[];
for(const [width,height] of [[1920,1080],[1440,900],[1280,800],[1024,768],[768,1024],[430,932],[390,844],[375,812],[844,390],[667,375]]){
console.log(`Checking ${width}x${height}`);await page.setViewportSize({width,height});await page.waitForTimeout(350);
if(width<960&&await page.locator('.storyToggle').getAttribute('aria-expanded')==='false')await page.locator('.storyToggle').click();
await page.locator('.storyMemoryCard').nth(3).click();await expect(page.locator('.storyMemoryCard').nth(3)).toHaveAttribute('aria-pressed','true');
await expect(page.locator('.timelineMarkerActive')).toHaveCount(1);
await expect(page.locator('.storyTimeline li').nth(3)).toHaveClass(/storyFlipped/);
await page.locator('.storyMemoryCard').nth(3).click();await expect(page.locator('.storyTimeline li').nth(3)).not.toHaveClass(/storyFlipped/);
await page.locator('.storyPhotoButton').nth(3).click();await expect(page.locator('.storyTimeline li').nth(3)).toHaveClass(/photoExpanded/);
await expect(page.locator('.storyTimeline li').nth(3).locator('.storyMemoryCard')).toBeHidden();
await page.locator('.storyPhotoButton').nth(3).click();await expect(page.locator('.storyTimeline li').nth(3).locator('.storyMemoryCard')).toBeVisible();
const size=await page.evaluate(()=>{const map=document.querySelector('.realMap'),canvas=map.querySelector('canvas'),pane=document.querySelector('.storyPaneScroll'),bounds=map.getBoundingClientRect(),controls=[...map.querySelectorAll('.maplibregl-ctrl')];return {overflow:document.documentElement.scrollWidth>innerWidth,mapWidth:map.clientWidth,canvasWidth:canvas.clientWidth,mapHeight:map.clientHeight,scrollable:pane.scrollHeight>pane.clientHeight,controlsContained:controls.every(control=>{const rect=control.getBoundingClientRect();return rect.top>=bounds.top-1&&rect.bottom<=bounds.bottom+1&&rect.left>=bounds.left-1&&rect.right<=bounds.right+1})}});
expect(size.overflow).toBe(false);expect(Math.abs(size.mapWidth-size.canvasWidth)).toBeLessThan(2);expect(size.mapHeight).toBeGreaterThanOrEqual(300);expect(size.scrollable).toBe(true);expect(size.controlsContained).toBe(true);
await page.getByRole('button',{name:'Fit all pins',exact:true}).click();await page.waitForTimeout(800);
await page.locator('.geoMarker.storyGeo').last().click();await expect(page.locator('.storyMemoryCard').last()).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(500);
const paneOnly=await page.evaluate(()=>{const pane=document.querySelector('.storyPaneScroll'),card=pane.querySelector('[data-selected="true"]');return {scroll:pane.scrollTop,visible:card.getBoundingClientRect().top>=pane.getBoundingClientRect().top-2}});expect(paneOnly.scroll).toBeGreaterThan(0);expect(paneOnly.visible).toBe(true);
await page.locator('.mapStoryLayout').screenshot({path:`outputs/map-story/${width}x${height}.png`});results.push({width,height,...size});
}
await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(page.locator('.storyMemory')).toHaveCount(0);await expect(page.locator('.timelineMarkerActive')).toHaveCount(0);await page.getByRole('button',{name:'Select all',exact:true}).click();await expect(page.locator('.storyMemory')).toHaveCount(12);
await page.getByRole('button',{name:'▶ Play our story',exact:true}).click();await expect(page.locator('.storyMemoryCard').first()).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(3700);await expect(page.locator('.storyMemoryCard').nth(1)).toHaveAttribute('aria-pressed','true');const gap=await page.evaluate(()=>{const map=document.querySelector('.adventureMap').getBoundingClientRect(),pane=document.querySelector('.storyPane').getBoundingClientRect();return pane.top-map.bottom});expect(Math.abs(gap)).toBeLessThan(2);
await page.locator('.storyMemoryCard').nth(2).click();await expect(page.getByRole('button',{name:'▶ Play our story',exact:true})).toBeVisible();await expect(page.locator('.storyTimeline li').nth(2)).toHaveClass(/storyFlipped/);
await page.locator('.mapStoryLayout').screenshot({path:'outputs/map-story/mobile-refinements.png'});
expect(errors).toEqual([]);console.log(JSON.stringify({passed:true,results,errors},null,2));
} finally {await browser.close()}
