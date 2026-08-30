import {assertTransition} from "../../../lib/order-domain";
import {requireUser} from "../../../lib/request-user";

export async function POST(request:Request){
 const context=await requireUser(request);
 if(!context)return Response.json({error:"Your session expired. Sign in again, reopen this proof, and retry."},{status:401});
 const {admin,user}=context;
 const body=await request.json().catch(()=>null) as any,proofId=String(body?.proofId||""),decision=String(body?.decision||""),feedback=String(body?.feedback||"").trim().slice(0,4000);
 if(!proofId||!["viewed","approved","changes_requested"].includes(decision))return new Response("Invalid proof response",{status:400});
 if(decision==="approved"&&feedback.toUpperCase()!=="APPROVE")return Response.json({error:"Type APPROVE exactly to confirm this proof."},{status:400});
 const proof=await admin.from("order_proofs").select("id,order_id,status").eq("id",proofId).single();if(proof.error)return new Response("Not found",{status:404});
 const orderResult=await admin.from("orders").select("id,customer_user_id,customer_email,order_status").eq("id",proof.data.order_id).single(),order=orderResult.data;
 const ownsOrder=Boolean(order&&(order.customer_user_id===user.id||String(order.customer_email||"").toLowerCase()===String(user.email||"").toLowerCase()));
 if(orderResult.error||!order||!ownsOrder)return Response.json({error:"This proof is not connected to your signed-in account. Sign in with the email used at checkout and try again."},{status:403});
 const target=decision==="approved"?"approved":decision==="changes_requested"?"changes_requested":"awaiting_customer_approval";
 if(target!==order.order_status)try{assertTransition(order.order_status,target)}catch(error){return new Response(error instanceof Error?error.message:"Invalid transition",{status:409})}
 const now=new Date().toISOString(),proofPatch:any={status:decision,updated_at:now};if(decision==="viewed")proofPatch.viewed_at=now;else{proofPatch.responded_at=now;proofPatch.customer_feedback=feedback}
 const updated=await admin.from("order_proofs").update(proofPatch).eq("id",proofId);if(updated.error)return new Response(updated.error.message,{status:500});
 if(target!==order.order_status)await admin.from("orders").update({order_status:target,updated_at:now}).eq("id",order.id);
 await admin.from("order_events").insert({order_id:order.id,event_type:`proof_${decision}`,from_status:order.order_status,to_status:target,actor_type:"customer",actor_id:user.id,metadata:{proof_id:proofId,feedback}});
 return Response.json({status:decision,orderStatus:target});
}
