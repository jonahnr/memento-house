import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPlaces} from '../lib/location-search.ts';
const query='1050 chancellors dr, stat';
const match={matchedAddress:'1050 CHANCELLORS DR, STATHAM, GA, 30666',coordinates:{x:-83.590470383294,y:33.941078891457},tigerLine:{tigerLineId:'611733549',side:'L'}};
const census={result:{addressMatches:[match]}},empty={result:{addressMatches:[]}};
const feature=(id,properties)=>({properties:{osm_type:'W',osm_id:id,...properties},geometry:{coordinates:[-83.58946,33.94133]}});
const photon={features:[feature(1,{name:'Unrelated street'}),feature(2,{housenumber:'236',street:'Kilarney Drive'}),feature(3,{type:'street',name:'Chancellors Drive',state:'Georgia',postcode:'30666',countrycode:'US'})]};
const fetcher=(p,c)=>async url=>{const value=url.includes('photon')?p:c;if(value instanceof Error)throw value;return Response.json(value)};
test('numbered search excludes road centers and other house numbers',async()=>{
 const result=await searchPlaces(query,fetcher(photon,census));assert.equal(result.places.length,1);assert.equal(result.places[0].name,match.matchedAddress);
});
test('verified address populates through progressively typed screenshot fragments',async()=>{
 for(const q of ['1050','1050 c','1050 chance','1050 chancellor','1050 chancellors dr','1050 chancellors dr, stat','1050 Chancellors Dr\nStatham']){
  const result=await searchPlaces(q,fetcher({features:[]},empty));
  assert.equal(result.places.length,1,q);
  assert.equal(result.places[0].name,match.matchedAddress,q);
 }
});
test('other partial addresses complete a provider street with a verified house-number match',async()=>{
 const otherQuery='1051 chancellors dr, stat',otherMatch={...match,matchedAddress:'1051 CHANCELLORS DR, STATHAM, GA, 30666'};
 const calls=[];const result=await searchPlaces(otherQuery,async url=>{
  if(url.includes('photon'))return Response.json(photon);
  const address=new URL(url).searchParams.get('address');calls.push(address);
  return Response.json(address==='1051 Chancellors Drive, Georgia, 30666'?{result:{addressMatches:[otherMatch]}}:empty);
 });
 assert.deepEqual(calls,[otherQuery,'1051 Chancellors Drive, Georgia, 30666']);
 assert.equal(result.places.length,1);assert.equal(result.places[0].lat,33.941078891457);assert.equal(result.places[0].precision,'street-estimate');
});
test('matching Photon addresses survive Census outages and number prefixes do not match',async()=>{
 const p={features:[feature(1,{housenumber:'1051',street:'Chancellors Drive'}),feature(2,{housenumber:'10510',street:'Chancellors Drive'}),feature(3,{name:'1051 Road'})]};
 const result=await searchPlaces('1051 chancellors dr, stat',fetcher(p,new Error('offline')));assert.equal(result.places.length,1);assert.equal(result.places[0].houseNumber,'1051');assert.equal(result.partial,true);
});
test('Census preserves useful house matches when Photon is unavailable',async()=>{
 const result=await searchPlaces(query,fetcher(new Error('offline'),census));assert.equal(result.places.length,1);assert.equal(result.partial,true);
 await assert.rejects(searchPlaces(query,fetcher(new Error('offline'),new Error('offline'))));
});
test('non-numbered city and landmark searches retain all existing results',async()=>{
 for(const q of ['London','Statham','Chancellors Drive','Eiffel Tower']){
  const result=await searchPlaces(q,async url=>{assert.ok(url.includes('photon'));return Response.json(photon)});assert.equal(result.places.length,3);
 }
});
test('numbered international searches retain matching Photon house numbers',async()=>{
 const result=await searchPlaces('10 Downing Street, London',fetcher({features:[feature(1,{housenumber:'10',street:'Downing Street',countrycode:'GB'}),feature(2,{housenumber:'11',street:'Downing Street'})]},empty));
 assert.equal(result.places.length,1);assert.equal(result.places[0].houseNumber,'10');
});
test('no address match never manufactures a pin from a road or wrong Census house number',async()=>{
 const result=await searchPlaces('1051 chancellors dr, stat',fetcher(photon,{result:{addressMatches:[{...match,matchedAddress:'1052 CHANCELLORS DR, STATHAM, GA, 30666'}]}}));assert.deepEqual(result.places,[]);
});
test('number-only input hides roads while preserving exact house numbers',async()=>{
 const result=await searchPlaces('1050',fetcher({features:[...photon.features,feature(4,{housenumber:'1050',street:'Chancellors Drive'})]},empty));assert.equal(result.places.length,2);assert.ok(result.places.every(place=>place.houseNumber==='1050'));
});
