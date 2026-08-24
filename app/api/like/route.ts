import {createClient} from "@supabase/supabase-js";
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,"0")).join("");
export async function POST(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return Response.json({error:"Like service is unavailable."},{status:503});
 const body=await request.json().catch(()=>null) as any,destinationId=String(body?.destinationId||""),anonymousId=String(body?.anonymousId||"");if(!destinationId||anonymousId.length<10||anonymousId.length>100)return Response.json({error:"Invalid request."},{status:400});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),{data:destination}=await admin.from("destinations").select("wedding_id").eq("id",destinationId).maybeSingle();if(!destination)return Response.json({error:"Destination not found."},{status:404});
 const{data:wedding}=await admin.from("weddings").select("owner_user_id,status").eq("id",destination.wedding_id).eq("status","active").maybeSingle();if(!wedding)return Response.json({error:"Map not found."},{status:404});
 const owner=await admin.auth.admin.getUserById(wedding.owner_user_id);if(owner.data.user?.user_metadata?.product_tier!=="plus")return Response.json({error:"Hearts are available on Memento Map Plus."},{status:403});
 const existing=await admin.from("destination_likes").select("id").eq("destination_id",destinationId).eq("anonymous_session_id",anonymousId).maybeSingle();
 if(existing.data){const removed=await admin.from("destination_likes").delete().eq("id",existing.data.id);return removed.error?Response.json({error:"Your heart could not be updated."},{status:500}):Response.json({ok:true,liked:false,delta:-1})}
 const ip=String(request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown"),actorHash=await digest(`${ip}:${anonymousId}`),claimed=await admin.rpc("claim_guest_action",{p_wedding_id:destination.wedding_id,p_actor_hash:actorHash,p_action:"heart",p_limit:30,p_window_seconds:3600});
 if(!claimed.error&&!claimed.data)return Response.json({error:"Too many reactions. Please try again later."},{status:429});
 const result=await admin.from("destination_likes").insert({destination_id:destinationId,anonymous_session_id:anonymousId});
 return result.error?Response.json({error:result.error.code==="23505"?"You already loved this place.":"Your heart could not be saved."},{status:result.error.code==="23505"?409:500}):Response.json({ok:true,liked:true,delta:1});
}
