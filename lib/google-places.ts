import type {Place,ResolvedPlace} from "./location-search.ts";

type AutocompleteResponse={suggestions?:Array<{placePrediction?:{placeId?:string;text?:{text?:string}}}>};
type PlaceDetailsResponse={id?:string;formattedAddress?:string;displayName?:{text?:string};location?:{latitude?:number;longitude?:number}};

const endpoint="https://places.googleapis.com/v1";
const headers=(apiKey:string,fieldMask:string)=>({"Content-Type":"application/json","X-Goog-Api-Key":apiKey,"X-Goog-FieldMask":fieldMask});

export async function googleAutocomplete(input:string,apiKey:string,sessionToken:string,fetcher:typeof fetch=fetch):Promise<Place[]>{
 const response=await fetcher(`${endpoint}/places:autocomplete`,{
  method:"POST",headers:headers(apiKey,"suggestions.placePrediction.placeId,suggestions.placePrediction.text.text"),
  body:JSON.stringify({input,sessionToken,includeQueryPredictions:false}),signal:AbortSignal.timeout(7000),cache:"no-store"
 });
 if(!response.ok)throw new Error(`Google Places autocomplete returned ${response.status}`);
 const json=await response.json() as AutocompleteResponse;
 return (json.suggestions||[]).flatMap(suggestion=>{
  const prediction=suggestion.placePrediction,id=prediction?.placeId,name=prediction?.text?.text;
  return id&&name?[{id:`google-${id}`,name,provider:"google" as const}]:[];
 });
}

export async function googlePlaceDetails(placeId:string,apiKey:string,sessionToken:string,fetcher:typeof fetch=fetch):Promise<ResolvedPlace>{
 const response=await fetcher(`${endpoint}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,{
  headers:headers(apiKey,"id,formattedAddress,displayName,location"),signal:AbortSignal.timeout(7000),cache:"no-store"
 });
 if(!response.ok)throw new Error(`Google Place Details returned ${response.status}`);
 const place=await response.json() as PlaceDetailsResponse,lat=Number(place.location?.latitude),lng=Number(place.location?.longitude);
 if(!place.id||!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error("Google Place Details omitted coordinates");
 return {id:`google-${place.id}`,name:place.formattedAddress||place.displayName?.text||"Selected place",lat,lng,provider:"google"};
}
