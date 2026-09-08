import {searchPlaces} from "../../../lib/location-search.ts";
import {googleAutocomplete,googlePlaceDetails} from "../../../lib/google-places.ts";
export async function GET(request:Request){
 const params=new URL(request.url).searchParams,key=process.env.GOOGLE_MAPS_API_KEY?.trim(),session=params.get("session")?.trim()||"";
 const placeId=params.get("placeId")?.trim()||"";
 if(placeId){
  if(!key)return Response.json({error:"Google address search is not configured."},{status:503});
  if(!/^[A-Za-z0-9_-]{5,300}$/.test(placeId)||!/^[A-Za-z0-9_-]{10,100}$/.test(session))return Response.json({error:"Invalid place selection."},{status:400});
  try{return Response.json({place:await googlePlaceDetails(placeId,key,session)})}
  catch{return Response.json({error:"That Google address could not be loaded."},{status:502})}
 }
 const query=params.get("q")?.trim().slice(0,180)||"";
 if(query.length<3)return Response.json({places:[]});
 if(key){
  if(!/^[A-Za-z0-9_-]{10,100}$/.test(session))return Response.json({error:"Invalid address search session."},{status:400});
  try{return Response.json({places:await googleAutocomplete(query,key,session),provider:"google"})}
  catch{return Response.json({error:"Google address search is temporarily unavailable."},{status:502})}
 }
 try{return Response.json(await searchPlaces(query))}
 catch{return Response.json({error:"Location search is temporarily unavailable."},{status:502})}
}
