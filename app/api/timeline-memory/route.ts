import {createClient} from "@supabase/supabase-js";
import {supabaseServerConfig} from "../../../lib/server-config";

const clean=(value:unknown,max:number)=>String(value||"").trim().slice(0,max);
const normalize=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,"0")).join("");
const allowedPhotos=new Set(["image/jpeg","image/png","image/webp"]);

export async function POST(request:Request){
 const{url,serviceRoleKey:key}=supabaseServerConfig();if(!url||!key)return Response.json({error:"Memory service is unavailable."},{status:503});
 const form=await request.formData().catch(()=>null);if(!form)return Response.json({error:"Invalid request."},{status:400});
 if(clean(form.get("website"),200))return Response.json({ok:true});
 const weddingId=clean(form.get("weddingId"),50),guest=clean(form.get("guest"),100),title=clean(form.get("title"),140),story=clean(form.get("story"),1200),place=clean(form.get("place"),180),date=clean(form.get("date"),10),anonymousId=clean(form.get("anonymousId"),100),startedAt=Number(form.get("startedAt")||0),lat=Number(form.get("lat")),lng=Number(form.get("lng")),photo=form.get("photo");
 const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(`${date}T00:00:00Z`));
 if(!weddingId||guest.length<1||title.length<2||story.length<5||place.length<2||!validDate||anonymousId.length<10||Date.now()-startedAt<1200||!Number.isFinite(lat)||!Number.isFinite(lng))return Response.json({error:"Please complete each required field, including the date and location."},{status:400});
 if(photo instanceof File&&(photo.size>8_000_000||!allowedPhotos.has(photo.type)))return Response.json({error:"Choose an optional JPG, PNG, or WebP photo smaller than 8 MB."},{status:400});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),wedding=await admin.from("weddings").select("id,contribution_status").eq("id",weddingId).eq("status","active").maybeSingle();
 if(!wedding.data||wedding.data.contribution_status==="closed"||wedding.data.contribution_status==="paused")return Response.json({error:"This map is not accepting memories right now."},{status:403});
 const ip=clean(request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown",80),actorHash=await digest(`${ip}:${anonymousId}`),claimed=await admin.rpc("claim_guest_action",{p_wedding_id:weddingId,p_actor_hash:actorHash,p_action:"memory",p_limit:3,p_window_seconds:900});
 if(!claimed.error&&!claimed.data)return Response.json({error:"Too many memories were submitted. Please try again later."},{status:429});
 let{data:destination}=await admin.from("destinations").select("id").eq("wedding_id",weddingId).eq("normalized_location_name",normalize(place)).maybeSingle();
 if(!destination){const created=await admin.from("destinations").insert({wedding_id:weddingId,location_name:place,normalized_location_name:normalize(place),latitude:lat,longitude:lng}).select("id").single();if(created.error)return Response.json({error:"That place could not be saved."},{status:500});destination=created.data}
 const created=await admin.from("timeline_entries").insert({wedding_id:weddingId,destination_id:destination.id,date_value:date,date_precision:"exact",approximate_date_label:null,sort_date:date,title,category:"Guest Memory",story,contributor_name:guest,visibility:"link",status:"published"}).select("id").single();
 if(created.error)return Response.json({error:"Your memory could not be saved."},{status:500});
 let photoSaved=false;
 if(photo instanceof File&&photo.size){
  const bucket="memento-photos";await admin.storage.createBucket(bucket,{public:true,fileSizeLimit:8_000_000,allowedMimeTypes:[...allowedPhotos]});
  const extension=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg",path=`guest-memories/${weddingId}/${created.data.id}.${extension}`,uploaded=await admin.storage.from(bucket).upload(path,photo,{contentType:photo.type,upsert:false});
  if(!uploaded.error){const publicUrl=admin.storage.from(bucket).getPublicUrl(path).data.publicUrl,photoRow=await admin.from("timeline_photos").insert({entry_id:created.data.id,storage_path:path,public_url:publicUrl,alt_text:`Memory shared by ${guest}`});photoSaved=!photoRow.error}
 }
 const photoRow=await admin.from("timeline_photos").select("public_url,alt_text").eq("entry_id",created.data.id).maybeSingle();
 return Response.json({entry:{id:created.data.id,date_value:date,approximate_date_label:null,sort_date:date,title,category:"Guest Memory",story,contributor_name:guest,photo:photoRow.data||null,destination:{location_name:place,latitude:lat,longitude:lng}},photoSaved});
}
