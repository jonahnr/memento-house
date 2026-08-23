import {createClient} from "@supabase/supabase-js";

const attempts=new Map<string,{count:number;reset:number}>();
const clean=(value:unknown,max:number)=>String(value||"").trim().slice(0,max);
const normalize=(s:string)=>s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();

export async function POST(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return Response.json({error:"Contribution service is unavailable."},{status:503});
 const body=await request.json().catch(()=>null) as any;if(!body)return Response.json({error:"Invalid request."},{status:400});
 if(clean(body.website,200))return Response.json({ok:true});
 const anonymousId=clean(body.anonymousId,100),now=Date.now(),startedAt=Number(body.startedAt||0),rate=attempts.get(anonymousId);
 if(anonymousId.length<10||!startedAt||now-startedAt<1200)return Response.json({error:"Please take a moment and try again."},{status:400});
 if(rate&&rate.reset>now&&rate.count>=5)return Response.json({error:"Too many contributions. Please try again later."},{status:429});
 attempts.set(anonymousId,{count:rate&&rate.reset>now?rate.count+1:1,reset:rate&&rate.reset>now?rate.reset:now+600000});
 const weddingId=clean(body.weddingId,50),place=clean(body.place,180),guest=clean(body.guest,100),message=clean(body.message,1000),category=clean(body.category,60),type=body.contributionType==="origin"?"origin":"recommendation",lat=Number(body.lat),lng=Number(body.lng);
 if(!weddingId||place.length<2||guest.length<1||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180||type==="recommendation"&&message.length<5)return Response.json({error:"Please complete each required field."},{status:400});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),{data:wedding}=await admin.from("weddings").select("id").eq("id",weddingId).eq("status","active").maybeSingle();
 if(!wedding)return Response.json({error:"This map is not accepting contributions."},{status:404});
 let{data:destination}=await admin.from("destinations").select("id").eq("wedding_id",weddingId).eq("normalized_location_name",normalize(place)).maybeSingle();
 if(!destination){const created=await admin.from("destinations").insert({wedding_id:weddingId,location_name:place,normalized_location_name:normalize(place),latitude:lat,longitude:lng}).select("id").single();if(created.error)return Response.json({error:"That place could not be saved."},{status:500});destination=created.data}
 const finalMessage=message||"Traveled from this place to celebrate with the couple.",finalCategory=type==="origin"?"Guest Origin":category||"Adventure";
 const duplicate=await admin.from("recommendations").select("id").eq("wedding_id",weddingId).eq("destination_id",destination.id).eq("guest_name",guest).limit(1).maybeSingle();
 if(duplicate.data)return Response.json({error:"That contribution is already on the map."},{status:409});
 const created=await admin.from("recommendations").insert({wedding_id:weddingId,destination_id:destination.id,guest_name:guest,message:finalMessage,category:finalCategory,status:"active"}).select("id").single();
 return created.error?Response.json({error:"Your contribution could not be saved."},{status:500}):Response.json({id:created.data.id,destinationId:destination.id,message:finalMessage,category:finalCategory});
}
