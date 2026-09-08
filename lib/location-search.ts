export type Place={name:string;lat:number;lng:number;id:string;precision?:"street-estimate"};
type PhotonFeature={properties?:Record<string,string|number>;geometry?:{coordinates?:number[]}};
type CensusMatch={matchedAddress:string;coordinates:{x:number;y:number};tigerLine?:{tigerLineId:string;side:string}};

// Census can match partial city names without a state/ZIP. Query it for numbered
// streets worldwide; keep Photon results even when Census has no US match.
export function isUSStreetQuery(query:string){
 return /^\d+[\w-]*\s+\S{3,}/.test(query.trim());
}
export async function searchPlaces(query:string,fetcher:typeof fetch=fetch){
 const read=async(url:string)=>{
  const response=await fetcher(url,{headers:{"User-Agent":"MementoHouse/1.0 contact@mementohouse.com"},signal:AbortSignal.timeout(7000),next:{revalidate:86400}} as RequestInit);
  if(!response.ok)throw new Error(`Location provider returned ${response.status}`);
  return response.json();
 };
 const jobs:Promise<Place[]>[]=[(async()=>{
  const json=await read(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&lang=en`);
  return (json.features||[]).map((feature:PhotonFeature)=>{
   const p=feature.properties||{},street=[p.housenumber,p.street].filter(Boolean).join(" ");
   const parts=[street,p.name,p.district,p.city,p.county,p.state,p.postcode,p.country].filter(Boolean);
   return {name:parts.filter((v,i,a)=>a.indexOf(v)===i).join(", ")||query,lng:Number(feature.geometry?.coordinates?.[0]),lat:Number(feature.geometry?.coordinates?.[1]),id:`${p.osm_type||"place"}${p.osm_id||crypto.randomUUID()}`};
  }).filter((place:Place)=>Number.isFinite(place.lat)&&Number.isFinite(place.lng));
 })()];
 if(isUSStreetQuery(query))jobs.push((async()=>{
  const json=await read(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`);
  return (json.result?.addressMatches||[]).map((match:CensusMatch)=>({name:match.matchedAddress,lat:match.coordinates?.y,lng:match.coordinates?.x,id:`census-${match.tigerLine?.tigerLineId||match.matchedAddress}-${match.tigerLine?.side||""}`,precision:"street-estimate" as const})).filter((p:Place)=>p.name&&Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 })());
 const results=await Promise.allSettled(jobs);
 if(results.every(result=>result.status==="rejected"))throw new Error("All location providers failed");
 // Append without replacing, filtering, or truncating any existing Photon results.
 return {places:results.flatMap(result=>result.status==="fulfilled"?result.value:[]),partial:results.some(result=>result.status==="rejected")};
}
