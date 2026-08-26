import {requireAdmin} from "../../../../lib/admin";
import {catalogPublic} from "../../../../lib/product-catalog";
import {assertTransition} from "../../../../lib/order-domain";

async function enrich(context:any,orders:any[]){
  if(!orders.length)return orders;
  const ids=orders.map(order=>order.id);
  const [questionnaires,entitlements,jobs,proofs,events,customizations]=await Promise.all([
    context.admin.from("questionnaires").select("id,order_id,status,questionnaire_type,answers,started_at,submitted_at").in("order_id",ids),
    context.admin.from("entitlements").select("id,order_id,entitlement,status").in("order_id",ids),
    context.admin.from("fulfillment_jobs").select("id,order_id,workflow,status,payload").in("order_id",ids),
    context.admin.from("order_proofs").select("*").in("order_id",ids).order("version",{ascending:false}),
    context.admin.from("order_events").select("*").in("order_id",ids).order("created_at",{ascending:false}),
    context.admin.from("checkout_customizations").select("id,payload,claimed_order_id").in("claimed_order_id",ids),
  ]);
  return orders.map(order=>({...order,
    questionnaire_required:order.questionnaire_status!=="not_required",
    questionnaires:(questionnaires.data||[]).filter((item:any)=>item.order_id===order.id),
    entitlements:(entitlements.data||[]).filter((item:any)=>item.order_id===order.id),
    fulfillment_jobs:(jobs.data||[]).filter((item:any)=>item.order_id===order.id),
    proofs:(proofs.data||[]).filter((item:any)=>item.order_id===order.id),
    events:(events.data||[]).filter((item:any)=>item.order_id===order.id),
    customization:(customizations.data||[]).find((item:any)=>item.claimed_order_id===order.id)||null,
  }));
}

export async function GET(request:Request){
  const context=await requireAdmin(request);if(!context)return new Response("Forbidden",{status:403});
  const url=new URL(request.url),id=url.searchParams.get("id"),showArchived=url.searchParams.get("archived")==="true";
  let query=context.admin.from("orders").select("*");
  if(id)query=query.eq("id",id);else{if(!showArchived)query=query.is("archived_at",null);query=query.order("created_at",{ascending:false}).limit(500)}
  let result=await query;
  if(result.error?.code==="42703"&&!id&&!showArchived)result=await context.admin.from("orders").select("*").order("created_at",{ascending:false}).limit(500);
  if(result.error)return Response.json({error:result.error.message},{status:500});
  const orders=await enrich(context,result.data||[]),active=orders.filter((order:any)=>!order.archived_at),paid=active.filter((order:any)=>["paid","admin_bypass","test_paid"].includes(order.payment_status)),realPaid=paid.filter((order:any)=>!order.is_test),revenue=realPaid.reduce((sum:number,order:any)=>sum+Number(order.amount_total||0),0);
  const byProduct=Object.values(active.reduce((memo:any,order:any)=>{const key=order.catalog_key||`${order.product}:${order.tier}`;memo[key]||={key,orders:0,revenue:0};memo[key].orders++;if(!order.is_test)memo[key].revenue+=Number(order.amount_total||0);return memo},{}));
  if(id)return orders[0]?Response.json({order:orders[0],catalog:catalogPublic()}):Response.json({error:"Order not found"},{status:404});
  return Response.json({orders,catalog:catalogPublic(),analytics:{orders:active.length,paid:paid.length,revenue,averageOrder:realPaid.length?Math.round(revenue/realPaid.length):0,awaitingApproval:active.filter((order:any)=>order.order_status==="awaiting_customer_approval").length,toShip:active.filter((order:any)=>["ready_to_ship","approved","in_production"].includes(order.order_status)).length,byProduct}});
}

export async function PATCH(request:Request){
  const context=await requireAdmin(request);if(!context)return new Response("Forbidden",{status:403});
  try{
    const body=await request.json(),id=String(body.id||"");if(!id)return new Response("Invalid order",{status:400});
    const current=await context.admin.from("orders").select("*").eq("id",id).single();if(current.error)throw current.error;
    const updates:Record<string,unknown>={};
    if(body.order_status){assertTransition(current.data.order_status,String(body.order_status));updates.order_status=body.order_status;const timestamp:Record<string,string>={questionnaire_in_progress:"questionnaire_started_at",proof_ready:"proof_ready_at",approved:"approved_at",shipped:"shipped_at",fulfilled:"fulfilled_at"};if(timestamp[body.order_status])updates[timestamp[body.order_status]]=new Date().toISOString()}
    for(const key of ["tracking_number","tracking_url","shipping_carrier","internal_notes"])if(key in body)updates[key]=body[key];
    updates.updated_at=new Date().toISOString();
    const result=await context.admin.from("orders").update(updates).eq("id",id).select().single();if(result.error)throw result.error;
    if(body.order_status)await context.admin.from("order_events").insert({order_id:id,event_type:"admin_transition",from_status:current.data.order_status,to_status:body.order_status,actor_type:"admin",actor_id:context.user.id});
    if(body.order_status==="shipped"){
      if(!body.tracking_number)throw new Error("Add a tracking number before marking an order shipped.");
      await context.admin.from("customer_notifications").insert({order_id:id,customer_user_id:current.data.customer_user_id,recipient_email:current.data.customer_email,notification_type:"order_shipped",subject:"Your Memento House order is on the way",payload:{carrier:body.shipping_carrier||"Carrier",tracking_number:body.tracking_number,tracking_url:body.tracking_url||""}});
      await context.admin.from("orders").update({shipping_notified_at:new Date().toISOString()}).eq("id",id);
    }
    return Response.json({order:result.data});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Update failed"},{status:400})}
}

export async function DELETE(request:Request){
  const context=await requireAdmin(request);if(!context)return new Response("Forbidden",{status:403});
  try{
    const body=await request.json(),id=String(body.id||""),current=await context.admin.from("orders").select("id,is_test,payment_status").eq("id",id).single();if(current.error)throw current.error;
    if(current.data.is_test){const deleted=await context.admin.from("orders").delete().eq("id",id);if(deleted.error)throw deleted.error;return Response.json({deleted:true,permanent:true})}
    const archived=await context.admin.from("orders").update({archived_at:new Date().toISOString(),archived_by:context.user.id,updated_at:new Date().toISOString()}).eq("id",id);if(archived.error)throw archived.error;
    await context.admin.from("order_events").insert({order_id:id,event_type:"order_archived",actor_type:"admin",actor_id:context.user.id});
    return Response.json({deleted:true,permanent:false});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Order could not be removed"},{status:400})}
}
