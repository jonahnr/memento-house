import {requireAdmin} from "../../../../lib/admin";
import {assertTransition} from "../../../../lib/order-domain";

export async function POST(request:Request){
 const context=await requireAdmin(request);if(!context)return new Response("Forbidden",{status:403});
 try{
  const form=await request.formData(),orderId=String(form.get("orderId")||""),message=String(form.get("message")||"").slice(0,2000),file=form.get("file");
  if(!orderId||!(file instanceof File)||file.size>25_000_000)return new Response("Choose a proof file smaller than 25 MB.",{status:400});
  const current=await context.admin.from("orders").select("id,order_status").eq("id",orderId).single();if(current.error)throw current.error;
  const versions=await context.admin.from("order_proofs").select("version").eq("order_id",orderId).order("version",{ascending:false}).limit(1),version=(versions.data?.[0]?.version||0)+1;
  const bucket="order-proofs";await context.admin.storage.createBucket(bucket,{public:false,fileSizeLimit:25_000_000});
  const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,"-"),path=`${orderId}/${String(version).padStart(3,"0")}-${crypto.randomUUID()}-${safe}`;
  const upload=await context.admin.storage.from(bucket).upload(path,file,{contentType:file.type||"application/octet-stream"});if(upload.error)throw upload.error;
  await context.admin.from("order_proofs").update({status:"superseded",updated_at:new Date().toISOString()}).eq("order_id",orderId).in("status",["draft","sent","viewed","changes_requested"]);
  const now=new Date().toISOString(),proof=await context.admin.from("order_proofs").insert({order_id:orderId,version,storage_path:path,file_name:file.name,mime_type:file.type||"application/octet-stream",message,status:"sent",created_by:context.user.id,sent_at:now}).select().single();if(proof.error)throw proof.error;
  const target=current.data.order_status==="proof_ready"?"awaiting_customer_approval":"proof_ready";if(target!==current.data.order_status){if(target==="proof_ready")assertTransition(current.data.order_status,target);await context.admin.from("orders").update({order_status:"awaiting_customer_approval",proof_ready_at:now,updated_at:now}).eq("id",orderId)}
  await context.admin.from("order_events").insert({order_id:orderId,event_type:"proof_sent",from_status:current.data.order_status,to_status:"awaiting_customer_approval",actor_type:"admin",actor_id:context.user.id,metadata:{proof_id:proof.data.id,version}});
  return Response.json({proof:proof.data});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Proof upload failed"},{status:400})}
}

export async function GET(request:Request){
 const context=await requireAdmin(request);if(!context)return new Response("Forbidden",{status:403});const url=new URL(request.url),id=url.searchParams.get("id")||"";
 const proof=await context.admin.from("order_proofs").select("*").eq("id",id).single();if(proof.error)return new Response("Not found",{status:404});
 const signed=await context.admin.storage.from("order-proofs").createSignedUrl(proof.data.storage_path,900);return Response.json({proof:proof.data,url:signed.data?.signedUrl||null});
}
