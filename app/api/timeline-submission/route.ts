import {createClient} from "@supabase/supabase-js";
import {resolveMapTier} from "../../../lib/map-entitlement";

const clean=(v:unknown,n:number)=>String(v||"").trim().slice(0,n),normalize=(s:string)=>s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,"0")).join("");
export async function POST(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return Response.json({error:"Timeline service unavailable"},{status:503});
 const body=await request.json().catch(()=>null) as any;if(!body||clean(body.website,200))return Response.json({ok:true});
 const slug=clean(body.slug,100),title=clean(body.title,160),story=clean(body.story,2000),contributor=clean(body.contributor,100),place=clean(body.place,180),category=clean(body.category,80)||"Guest Memory",lat=Number(body.lat),lng=Number(body.lng);
 if(!slug||title.length<2||contributor.length<1||!Number.isFinite(lat)||!Number.isFinite(lng))return Response.json({error:"Complete the required fields."},{status:400});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),{data:wedding}=await admin.from("weddings").select("id,owner_user_id,status").eq("slug",slug).eq("status","active").maybeSingle();if(!wedding)return Response.json({error:"Story not found."},{status:404});
 const owner=await admin.auth.admin.getUserById(wedding.owner_user_id),tier=await resolveMapTier(admin,wedding.owner_user_id,owner.data.user?.user_metadata);if(tier!=="timeline-plus")return Response.json({error:"Guest timeline contributions are not enabled."},{status:403});
 const actor=await digest(`${request.headers.get("cf-connecting-ip")||"unknown"}:${clean(body.anonymousId,100)}`),claimed=await admin.rpc("claim_guest_action",{p_wedding_id:wedding.id,p_actor_hash:actor,p_action:"timeline",p_limit:3,p_window_seconds:900});if(!claimed.error&&!claimed.data)return Response.json({error:"Too many submissions. Try again later."},{status:429});
 let{data:destination}=await admin.from("destinations").select("id").eq("wedding_id",wedding.id).eq("normalized_location_name",normalize(place)).maybeSingle();if(!destination){const made=await admin.from("destinations").insert({wedding_id:wedding.id,location_name:place,normalized_location_name:normalize(place),latitude:lat,longitude:lng}).select("id").single();if(made.error)return Response.json({error:"Location could not be saved."},{status:500});destination=made.data}
 const date=clean(body.date,10)||new Date().toISOString().slice(0,10),created=await admin.from("timeline_entries").insert({wedding_id:wedding.id,destination_id:destination.id,date_value:date,sort_date:date,date_precision:"exact",title,category,story,contributor_name:contributor,visibility:"private",status:"pending"}).select("id").single();
 return created.error?Response.json({error:"Memory could not be submitted."},{status:500}):Response.json({id:created.data.id,status:"pending"});
}
