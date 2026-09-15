import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_OCCASIONS,mapTypeConfig,defaultMapCategories,parseMapOccasion} from '../lib/memento-map-types.ts';
import {validateCart} from '../lib/cart.ts';
import {CELEBRATIONS,CELEBRATION_GROUPS} from '../lib/celebrations.ts';
test('each granular occasion preserves its identity and seeds matching contribution categories',()=>{
 for(const [slug,occasion] of Object.entries(MAP_OCCASIONS)){
  const [item]=validateCart([{id:'occasion-map',product:'map',tier:'plus',addon:'none',customization:'',mapType:occasion.type,mapOccasion:slug}]);
  assert.equal(item.mapOccasion,slug);
  assert.equal(mapTypeConfig(item.mapType,item.mapOccasion).name,occasion.name);
  assert.deepEqual(defaultMapCategories(item.mapType,item.mapOccasion).map(row=>row.label),occasion.categories);
 }
 assert.equal(parseMapOccasion('anniversary','next_chapter'),undefined);
});
test('celebration catalog has the product matrix and one customer-facing Next Chapter experience',()=>{
 const expected={wedding:3,'family-reunion':3,'celebration-of-life':2,anniversary:3};
 for(const [slug,count] of Object.entries(expected)){const item=CELEBRATIONS.find(row=>row.slug===slug);assert.equal(item.status,'Available now');assert.equal(item.products.length,count);assert.ok(item.products.every(product=>!product.href.startsWith('/contact')));}
 assert.deepEqual(CELEBRATIONS.find(row=>row.slug==='next-chapter').products.map(row=>row.name),['Memento Map','Tile Board','Memento Deck']);
 assert.equal(CELEBRATIONS.find(row=>row.slug==='next-chapter').products[0].href,'/memento-map/next-chapter');
 assert.ok(!CELEBRATION_GROUPS.some(row=>row.slug==='retirement'));
});
