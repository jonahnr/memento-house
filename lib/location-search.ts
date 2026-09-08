export type Place={name:string;lat:number;lng:number;id:string;precision?:"street-estimate";houseNumber?:string};
type PhotonFeature={properties?:Record<string,string|number>;geometry?:{coordinates?:number[]}};
type CensusMatch={matchedAddress:string;coordinates:{x:number;y:number};tigerLine?:{tigerLineId:string;side:string}};
const houseNumber=(query:string)=>query.trim().match(/^(\d+[a-z]?(?:-\d+[a-z]?)?)(?=\s|$)/i)?.[1].toLowerCase();
const streetWords=(value:string)=>value.toLowerCase().replace(/[.,]/g," ").replace(/\b(dr|rd|st|ave|blvd|ln|ct|cir|pkwy|pl|hwy)\b/g,word=>({dr:"drive",rd:"road",st:"street",ave:"avenue",blvd:"boulevard",ln:"lane",ct:"court",cir:"circle",pkwy:"parkway",pl:"place",hwy:"highway"}[word]||word)).replace(/\s+/g," ").trim();
export function isUSStreetQuery(query:string){return /^\d+[\w-]*\s+\S{3,}/.test(query.trim())}
export async function searchPlaces(query:string,fetcher:typeof fetch=fetch){
 const number=houseNumber(query);
 const read=async(url:string)=>{
  const response=await fetcher(url,{headers:{"User-Agent":"MementoHouse/1.0 contact@mementohouse.com"},signal:AbortSignal.timeout(7000),next:{revalidate:86400}} as RequestInit);
  if(!response.ok)throw new Error(`Location provider returned ${response.status}`);
  return response.json();
 };
 const census=async(address:string):Promise<Place[]>=>{
  const json=await read(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`);
  return (json.result?.addressMatches||[]).map((match:CensusMatch)=>({name:match.matchedAddress,lat:match.coordinates?.y,lng:match.coordinates?.x,id:`census-${match.tigerLine?.tigerLineId||match.matchedAddress}-${match.tigerLine?.side||""}`,precision:"street-estimate" as const,houseNumber:houseNumber(match.matchedAddress||"")})).filter((p:Place)=>p.name&&Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 };
 let features:PhotonFeature[]=[];
 const jobs:Promise<Place[]>[]=[(async()=>{
  const json=await read(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&lang=en`);
  features=json.features||[];
  return features.map(feature=>{
   const p=feature.properties||{},street=[p.housenumber,p.street].filter(Boolean).join(" ");
   const parts=[street,p.name,p.district,p.city,p.county,p.state,p.postcode,p.country].filter(Boolean);
   return {name:parts.filter((v,i,a)=>a.indexOf(v)===i).join(", ")||query,lng:Number(feature.geometry?.coordinates?.[0]),lat:Number(feature.geometry?.coordinates?.[1]),id:`${p.osm_type||"place"}${p.osm_id||crypto.randomUUID()}`,houseNumber:p.housenumber?String(p.housenumber).toLowerCase():undefined};
  }).filter(place=>Number.isFinite(place.lat)&&Number.isFinite(place.lng));
 })()];
 if(isUSStreetQuery(query))jobs.push(census(query));
 const results=await Promise.allSettled(jobs);
 if(results.every(result=>result.status==="rejected"))throw new Error("All location providers failed");
 let places=results.flatMap(result=>result.status==="fulfilled"?result.value:[]),partial=results.some(result=>result.status==="rejected");
 if(number){
  places=places.filter(place=>place.houseNumber===number);
  if(!places.length){
   // Complete only streets actually returned by Photon, then require Census to
   // validate the house number. Never turn a road center into an address pin.
   const typedStreet=streetWords(query.trim().slice(number.length));
   const candidates=[...new Set(features.flatMap(feature=>{
    const p=feature.properties||{},street=String(p.street||(p.type==="street"?p.name:"")||""),normalized=streetWords(street);
    if(p.countrycode!=="US"||!normalized||!(typedStreet===normalized||typedStreet.startsWith(normalized+" "))||!p.state)return [];
    return [[`${number} ${street}`,p.city,p.state,p.postcode].filter(Boolean).join(", ")];
   }))].slice(0,7);
   const completed=await Promise.allSettled(candidates.map(census));
   partial ||= completed.some(result=>result.status==="rejected");
   places=completed.flatMap(result=>result.status==="fulfilled"?result.value:[]).filter(place=>place.houseNumber===number);
  }
 }
 const seen=new Set<string>();
 return {places:places.filter(place=>{const key=`${place.id}:${place.name}`;if(seen.has(key))return false;seen.add(key);return true}),partial};
}
