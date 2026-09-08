import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPlaces} from '../lib/location-search.ts';
import {googleAutocomplete,googlePlaceDetails} from '../lib/google-places.ts';

const match={matchedAddress:'1050 CHANCELLORS DR, STATHAM, GA, 30666',coordinates:{x:-83.590470383294,y:33.941078891457},tigerLine:{tigerLineId:'611733549',side:'L'}};
const census={result:{addressMatches:[match]}},empty={result:{addressMatches:[]}};
const feature=(id,properties)=>({properties:{osm_type:'W',osm_id:id,...properties},geometry:{coordinates:[-83.58946,33.94133]}});
const photon={features:[feature(1,{name:'Unrelated street'}),feature(2,{housenumber:'236',street:'Kilarney Drive'}),feature(3,{type:'street',name:'Chancellors Drive',state:'Georgia',postcode:'30666',countrycode:'US'})]};
const fetcher=(p,c)=>async url=>{const value=url.includes('photon')?p:c;if(value instanceof Error)throw value;return Response.json(value)};

test('fallback numbered search excludes road centers and other house numbers',async()=>{
 const result=await searchPlaces('1050 chancellors dr, statham',fetcher(photon,census));
 assert.equal(result.places.length,1);assert.equal(result.places[0].name,match.matchedAddress);
});
test('fallback completes a partial provider street with a verified house-number match',async()=>{
 const calls=[];const result=await searchPlaces('1050 chancellors dr, stat',async url=>{
  if(url.includes('photon'))return Response.json(photon);
  const address=new URL(url).searchParams.get('address');calls.push(address);
  return Response.json(address==='1050 Chancellors Drive, Georgia, 30666'?census:empty);
 });
 assert.deepEqual(calls,['1050 chancellors dr, stat','1050 Chancellors Drive, Georgia, 30666']);
 assert.equal(result.places.length,1);assert.equal(result.places[0].lat,33.941078891457);
});
test('fallback preserves a working provider if the other is unavailable',async()=>{
 const exact={features:[feature(1,{housenumber:'1050',street:'Chancellors Drive'})]};
 const photonOnly=await searchPlaces('1050 chancellors',fetcher(exact,new Error('offline')));assert.equal(photonOnly.places.length,1);assert.equal(photonOnly.partial,true);
 const censusOnly=await searchPlaces('1050 chancellors',fetcher(new Error('offline'),census));assert.equal(censusOnly.places.length,1);assert.equal(censusOnly.partial,true);
 await assert.rejects(searchPlaces('1050 chancellors',fetcher(new Error('offline'),new Error('offline'))));
});
test('fallback city and landmark searches retain original provider results',async()=>{
 for(const query of ['London','Statham','Eiffel Tower']){const result=await searchPlaces(query,async url=>{assert.ok(url.includes('photon'));return Response.json(photon)});assert.equal(result.places.length,3)}
});
test('fallback never manufactures a pin from a road or wrong house number',async()=>{
 const wrong={result:{addressMatches:[{...match,matchedAddress:'1052 CHANCELLORS DR, STATHAM, GA, 30666'}]}};
 const result=await searchPlaces('1051 chancellors dr, stat',fetcher(photon,wrong));assert.deepEqual(result.places,[]);
});

test('Google autocomplete supports all reported addresses from partial input',async()=>{
 const examples=[
  ['5331 Rex','5331 Rexford Court, Montgomery, AL 36116, USA'],
  ['8642 Yule','8642 Yule Street, Arvada, CO 80007, USA'],
  ['1693 Alice','1693 Alice Court, Annapolis, MD 21401, USA']
 ];
 for(const [input,label] of examples){
  let request;
  const places=await googleAutocomplete(input,'server-secret','session-123456',async(url,options)=>{request={url,options};return Response.json({suggestions:[{placePrediction:{placeId:`place-${input}`,text:{text:label}}}]})});
  assert.equal(request.url,'https://places.googleapis.com/v1/places:autocomplete');
  assert.equal(request.options.method,'POST');assert.equal(request.options.headers['X-Goog-Api-Key'],'server-secret');
  assert.match(request.options.headers['X-Goog-FieldMask'],/placeId/);
  assert.deepEqual(JSON.parse(request.options.body),{input,sessionToken:'session-123456',includeQueryPredictions:false});
  assert.deepEqual(places,[{id:`google-place-${input}`,name:label,provider:'google'}]);
 }
});
test('Google Place Details resolves a selected prediction to an address and coordinates',async()=>{
 let request;
 const place=await googlePlaceDetails('ChIJ-example','server-secret','session-123456',async(url,options)=>{request={url,options};return Response.json({id:'ChIJ-example',formattedAddress:'5331 Rexford Ct, Montgomery, AL 36116, USA',location:{latitude:32.312,longitude:-86.214}})});
 assert.equal(request.url,'https://places.googleapis.com/v1/places/ChIJ-example?sessionToken=session-123456');
 assert.equal(request.options.headers['X-Goog-Api-Key'],'server-secret');assert.equal(request.options.headers['X-Goog-FieldMask'],'id,formattedAddress,displayName,location');
 assert.deepEqual(place,{id:'google-ChIJ-example',name:'5331 Rexford Ct, Montgomery, AL 36116, USA',lat:32.312,lng:-86.214,provider:'google'});
});
test('Google rejects malformed responses instead of inventing coordinates',async()=>{
 await assert.rejects(googleAutocomplete('5331 Rex','key','session-123456',async()=>new Response('',{status:403})));
 await assert.rejects(googlePlaceDetails('place','key','session-123456',async()=>Response.json({id:'place',formattedAddress:'Missing coordinates'})));
});
