import {createClient} from "@supabase/supabase-js";

export async function POST(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return Response.json({error:"Like service is unavailable."},{status:503});
 const body=await request.json().catch(()=>null) as any,destinationId=String(body?.destinationId||""),anonymousId=String(body?.anonymousId||"");if(!destinationId||anonymousId.length<10||anonymousId.length>100)return Response.json({error:"Invalid request."},{status:400});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),{data:destination}=await admin.from("destinations").select("wedding_id").eq("id",destinationId).maybeSingle();if(!destination)return Response.json({error:"Destination not found."},{status:404});
 const{data:wedding}=await admin.from("weddings").select("owner_user_id,status").eq("id",destination.wedding_id).eq("status","active").maybeSingle();if(!wedding)return Response.json({error:"Map not found."},{status:404});
 const owner=await admin.auth.admin.getUserById(wedding.owner_user_id),tier=owner.data.user?.user_metadata?.product_tier;if(tier!=="plus")return Response.json({error:"Hearts are available on Memento Map Plus."},{status:403});
 const result=await admin.from("destination_likes").insert({destination_id:destinationId,anonymous_session_id:anonymousId});
 return result.error?Response.json({error:result.error.code==="23505"?"You already loved this place.":"Your heart could not be saved."},{status:result.error.code==="23505"?409:500}):Response.json({ok:true});
}
