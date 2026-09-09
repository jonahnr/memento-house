import {createClient} from "@supabase/supabase-js";
import {deleteStreamVideo,verifyStreamWebhook} from "../../../../lib/cloudflare-stream";
import {supabaseServerConfig} from "../../../../lib/server-config";

export async function POST(request:Request){
 const raw=await request.text();if(!verifyStreamWebhook(raw,request.headers.get("webhook-signature")))return Response.json({error:"Invalid webhook signature."},{status:401});
 const payload=await Promise.resolve().then(()=>JSON.parse(raw)).catch(()=>null) as {uid?:string;readyToStream?:boolean;duration?:number;thumbnail?:string;playback?:{hls?:string;dash?:string};status?:{state?:string;errorReasonText?:string}}|null;if(!payload?.uid)return Response.json({error:"Missing video id."},{status:400});
 const{url,serviceRoleKey:key}=supabaseServerConfig();if(!url||!key)return Response.json({error:"Media service unavailable."},{status:503});const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),ready=payload.readyToStream===true||payload.status?.state==="ready",failed=["error","failed"].includes(String(payload.status?.state||"").toLowerCase()),state=ready?"ready":failed?"failed":"processing";
 if(state==="processing"){await admin.from("media_assets").update({status:"processing",updated_at:new Date().toISOString()}).eq("cloudflare_uid",payload.uid).in("status",["reserved","uploading"]);return Response.json({ok:true})}
 const finalized=await admin.rpc("finalize_stream_video",{p_cloudflare_uid:payload.uid,p_state:state,p_duration_seconds:Number(payload.duration||0),p_playback_url:payload.playback?.hls||payload.playback?.dash||null,p_thumbnail_url:payload.thumbnail||null,p_error:payload.status?.errorReasonText||null});if(finalized.error)return Response.json({error:"Webhook update failed."},{status:500});const result=await admin.from("media_assets").select("status,error_message").eq("cloudflare_uid",payload.uid).maybeSingle();if(result.data?.status==="failed"&&result.data.error_message?.includes("reserved duration"))await deleteStreamVideo(payload.uid).catch(()=>undefined);return Response.json({ok:true})
}
