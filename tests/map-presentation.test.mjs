import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const {eventQrUrl,isQrVisit,typographyTheme,typographyThemes,visibleStoryMemories}=await loadTs('lib/map-presentation.ts');
const {qrSignCopy,qrLayouts}=await loadTs('lib/qr-sign.ts');
const {withWeddingStory}=await loadTs('lib/wedding-story.ts');
test('QR links explicitly opt in; UTMs alone never trigger contribution',()=>{
 const url=new URL(eventQrUrl('https://mementohouse.com/map/test?existing=keep'));
 assert.equal(url.searchParams.get('existing'),'keep');assert.equal(url.searchParams.get('utm_source'),'event_qr');assert.equal(url.searchParams.get('utm_medium'),'print');assert.ok(isQrVisit(url.search));
 assert.equal(isQrVisit('?utm_source=event_qr&utm_medium=print'),false);assert.equal(isQrVisit(''),false);assert.equal(isQrVisit('?source=other'),false);
});
test('all five themes resolve safely, with Classic for new and legacy metadata',()=>{
 assert.equal(typographyThemes.length,5);assert.equal(typographyTheme(undefined).id,'classic');assert.equal(typographyTheme('unknown').id,'classic');for(const theme of typographyThemes){assert.equal(typographyTheme(theme.id),theme);assert.ok(theme.headline&&theme.body&&theme.accent)}
});
test('hiding guest memories preserves owner timeline records and never mutates source data',()=>{
 const records=[{id:'guest',category:'Guest Memory'},{id:'owner',category:'Milestone'}],original=structuredClone(records);
 assert.deepEqual(visibleStoryMemories(records),records);assert.deepEqual(visibleStoryMemories(records,{include_guest_memories:false}),[records[1]]);assert.deepEqual(visibleStoryMemories(records,{include_guest_memories:true}),records);assert.deepEqual(records,original);
});
test('sign instructions and personalisation follow categories and capabilities',()=>{
 for(const map_type of ['wedding','family_reunion','celebration_of_life','next_chapter','events_community'])for(const tier of ['map','plus','timeline-plus']){
  const copy=qrSignCopy({map_type,title:'A special gathering',partner_one_name:'A',partner_two_name:'B'},tier),text=copy.instructions.map(step=>step.title+' '+step.text).join(' ');
  assert.equal(/share a memory/i.test(text),tier==='timeline-plus');assert.equal(copy.name,map_type==='wedding'?'A & B':'A special gathering');if(map_type!=='wedding')assert.doesNotMatch(copy.supporting,/wedding|couple/);
 }
 assert.match(qrSignCopy({map_type:'wedding',map_subtype:'anniversary',title:'Our years',partner_one_name:'A',partner_two_name:'B'},'map').supporting,/anniversary/);
 assert.deepEqual(Object.values(qrLayouts).map(size=>[size.width,size.height]),[[8.5,11],[8.5,11],[4,6],[5,7]]);
});
test('non-Wedding maps and Anniversary never acquire an invented wedding chapter',()=>{
 for(const map_type of ['family_reunion','celebration_of_life','next_chapter','events_community'])assert.deepEqual(withWeddingStory({id:'map',wedding_date:'2026-01-01',map_type},[]),[]);
 assert.deepEqual(withWeddingStory({id:'map',wedding_date:'2026-01-01',map_type:'wedding',map_subtype:'anniversary'},[]),[]);
});

test('individual story exclusions preserve defaults and the saved global opt-out',()=>{
 const memories=[{id:'included',category:'Guest Memory'},{id:'excluded',category:'Guest Memory'},{id:'owner',category:'Milestone'}];
 assert.deepEqual(visibleStoryMemories(memories,{excluded_story_memory_ids:['excluded']}),[memories[0],memories[2]]);
 assert.deepEqual(visibleStoryMemories(memories,{include_guest_memories:false,excluded_story_memory_ids:['excluded']}),[memories[2]]);
 assert.equal(memories.length,3);
});
