import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPlaces,isUSStreetQuery} from '../lib/location-search.ts';
const query='1050 Chancellors Dr, Statham, GA 30666';
const census={result:{addressMatches:[{matchedAddress:'1050 CHANCELLORS DR, STATHAM, GA, 30666',coordinates:{x:-83.590470383294,y:33.941078891457},tigerLine:{tigerLineId:'611733549',side:'L'}}]}};
const photon={features:Array.from({length:7},(_,i)=>({properties:{name:`Original result ${i}`,osm_type:'N',osm_id:i+1},geometry:{coordinates:[-84+i,34]}}))};
const fetcher=(p,c)=>async url=>{const value=url.includes('photon')?p:c;if(value instanceof Error)throw value;return Response.json(value)};
test('reported address receives Census match when Photon has no results',async()=>{
 const {places}=await searchPlaces(query,fetcher({features:[]},census));assert.equal(places.length,1);assert.equal(places[0].lat,33.941078891457);assert.equal(places[0].lng,-83.590470383294);assert.equal(places[0].precision,'street-estimate');
});
test('additional address coverage preserves all seven original results and their order',async()=>{
 const old=await searchPlaces('Statham',fetcher(photon,census));const added=await searchPlaces(query,fetcher(photon,census));assert.deepEqual(added.places.slice(0,7),old.places);assert.equal(added.places.length,8);
});
test('either provider failure preserves the other provider results',async()=>{
 const p=await searchPlaces(query,fetcher(photon,new Error('offline')));assert.equal(p.places.length,7);assert.equal(p.partial,true);
 const c=await searchPlaces(query,fetcher(new Error('offline'),census));assert.equal(c.places.length,1);assert.equal(c.partial,true);
 await assert.rejects(searchPlaces(query,fetcher(new Error('offline'),new Error('offline'))));
});
test('landmarks and international city searches retain original provider coverage',async()=>{
 for(const q of ['Eiffel Tower','London','Statham']){assert.equal(isUSStreetQuery(q),false);const result=await searchPlaces(q,async url=>{assert.ok(url.includes('photon'));return Response.json(photon)});assert.equal(result.places.length,7)}
 for(const q of [query,'1050 Chancellors Drive, Statham GA','4600 Silver Hill Rd, Washington DC'])assert.equal(isUSStreetQuery(q),true);
});
test('unmatched and invalid supplementary addresses never invent coordinates',async()=>{
 const result=await searchPlaces(query,fetcher(photon,{result:{addressMatches:[{matchedAddress:'Broken',coordinates:{}}]}}));assert.equal(result.places.length,7);
});

test('screenshot partial address adds the Georgia match without removing existing suggestions',async()=>{
 for(const q of ['1050 chancellors dr statha','1050 chancellors dr statham','1050 Chancellors Dr']){
  assert.equal(isUSStreetQuery(q),true);
  const result=await searchPlaces(q,fetcher(photon,census));
  assert.equal(result.places.length,8);
  assert.equal(result.places[7].name,'1050 CHANCELLORS DR, STATHAM, GA, 30666');
 }
});
test('numbered international addresses keep all Photon matches when Census finds nothing',async()=>{
 const result=await searchPlaces('10 Downing Street, London SW1A 2AA',fetcher(photon,{result:{addressMatches:[]}}));
 assert.equal(result.places.length,7);
 assert.deepEqual(result.places.map(p=>p.name),photon.features.map(f=>f.properties.name));
});
