import {searchPlaces} from "../../../lib/location-search.ts";
export async function GET(request:Request){
 const query=new URL(request.url).searchParams.get("q")?.trim().slice(0,180)||"";
 if(query.length<3)return Response.json({places:[]});
 try{return Response.json(await searchPlaces(query))}
 catch{return Response.json({error:"Location search is temporarily unavailable."},{status:502})}
}
