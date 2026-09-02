import {createClient} from "@supabase/supabase-js";
import {supabaseServerConfig} from "../../../lib/server-config";

const clean=(value:unknown,max:number)=>String(value||"").trim().slice(0,max);
const normalize=(s:string)=>s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,"0")).join("");

export async function POST(request:Request){
 const{url,serviceRoleKey:key}=supabaseServerConfig();if(!key)return Response.json({error:"Contribution service is unavailable."},{status:503});
 const body=await request.json().catch(()=>null) as any;if(!body)return Response.json({error:"Invalid request."},{status:400});
 if(clean(body.website,200))return Response.json({ok:true});
 const anonymousId=clean(body.anonymousId,100),ip=clean(request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown",80),now=Date.now(),startedAt=Number(body.startedAt||0);
 if(anonymousId.length<10||!startedAt||now-startedAt<1200)return Response.json({error:"Please take a moment and try again."},{status:400});
 const weddingId=clean(body.weddingId,50),place=clean(body.place,180),guest=clean(body.guest,100),message=clean(body.message,1000),category=clean(body.category,60),type=body.contributionType==="origin"?"origin":"recommendation",lat=Number(body.lat),lng=Number(body.lng);
 if(!weddingId||place.length<2||guest.length<1||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180||type==="recommendation"&&message.length<5)return Response.json({error:"Please complete each required field."},{status:400});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});let weddingResult=await admin.from("weddings").select("id,wedding_date,contribution_status,contribution_closes_at").eq("id",weddingId).eq("status","active").maybeSingle();
 if(weddingResult.error?.code==="42703")weddingResult=await admin.from("weddings").select("id,wedding_date").eq("id",weddingId).eq("status","active").maybeSingle() as typeof weddingResult;
 const wedding=weddingResult.data;
 if(!wedding)return Response.json({error:"This map is not accepting contributions."},{status:404});
 if(wedding.contribution_status==="paused")return Response.json({error:"Guest contributions are temporarily paused by the couple."},{status:403});
 if(wedding.contribution_status==="closed")return Response.json({error:"This map is closed to new guest contributions."},{status:403});
 if(wedding.contribution_closes_at&&new Date(wedding.contribution_closes_at)<=new Date())return Response.json({error:"The contribution window for this map has closed."},{status:403});
 const actorHash=await digest(`${ip}:${anonymousId}`),claimed=await admin.rpc("claim_guest_action",{p_wedding_id:weddingId,p_actor_hash:actorHash,p_action:"contribution",p_limit:4,p_window_seconds:900});
 if(!claimed.error&&!claimed.data)return Response.json({error:"Too many contributions. Please try again later."},{status:429});
 if(wedding.wedding_date){const closes=new Date(`${wedding.wedding_date}T23:59:59Z`);closes.setUTCDate(closes.getUTCDate()+14);if(new Date()>closes)return Response.json({error:"This wedding map is now closed to new guest contributions."},{status:403})}
 let{data:destination}=await admin.from("destinations").select("id").eq("wedding_id",weddingId).eq("normalized_location_name",normalize(place)).maybeSingle();
 if(!destination){const created=await admin.from("destinations").insert({wedding_id:weddingId,location_name:place,normalized_location_name:normalize(place),latitude:lat,longitude:lng}).select("id").single();if(created.error)return Response.json({error:"That place could not be saved."},{status:500});destination=created.data}
 const finalMessage=message||"Traveled from this place to celebrate with the couple.",finalCategory=type==="origin"?"Guest Origin":category||"Adventure";
 const duplicate=await admin.from("recommendations").select("id").eq("wedding_id",weddingId).eq("destination_id",destination.id).eq("guest_name",guest).limit(1).maybeSingle();
 if(duplicate.data)return Response.json({error:"That contribution is already on the map."},{status:409});
 const prior=await admin.from("recommendations").select("id",{count:"exact",head:true}).eq("wedding_id",weddingId).ilike("guest_name",guest);
 if((prior.count||0)>=6)return Response.json({error:"You have reached the contribution limit for this map."},{status:429});
 const created=await admin.from("recommendations").insert({wedding_id:weddingId,destination_id:destination.id,guest_name:guest,message:finalMessage,category:finalCategory,status:"active"}).select("id").single();
 return created.error?Response.json({error:"Your contribution could not be saved."},{status:500}):Response.json({id:created.data.id,destinationId:destination.id,message:finalMessage,category:finalCategory});
}
