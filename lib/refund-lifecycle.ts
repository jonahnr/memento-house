import type {SupabaseClient} from "@supabase/supabase-js";
import {sendRefundEmail} from "./customer-email";
import {resolveCatalog} from "./product-catalog";

export async function revokeRefundedOrder(admin:SupabaseClient,order:any,input:{actorType:string;actorId?:string;reason?:string;stripeRefundId?:string;amount?:number}){
 const now=new Date().toISOString(),amount=input.amount??Number(order.amount_total||0),item=resolveCatalog(order.product,order.tier,order.addons||[]);
 const updated=await admin.from("orders").update({payment_status:"refunded",order_status:"refunded",entitlement_status:"revoked",updated_at:now}).eq("id",order.id);if(updated.error)throw updated.error;
 const results=await Promise.all([
  admin.from("entitlements").update({status:"revoked",updated_at:now}).eq("order_id",order.id),
  admin.from("fulfillment_jobs").update({status:"cancelled",updated_at:now}).eq("order_id",order.id),
  admin.from("customer_notifications").update({status:"cancelled"}).eq("order_id",order.id).eq("status","queued"),
 ]);for(const result of results)if(result.error)throw result.error;
 await admin.from("order_events").insert({order_id:order.id,event_type:"refund_completed",from_status:order.order_status,to_status:"refunded",actor_type:input.actorType,actor_id:input.actorId||null,metadata:{reason:input.reason||"Full refund",stripe_refund_id:input.stripeRefundId||null,amount}});
 if(order.customer_user_id){const active=await admin.from("entitlements").select("entitlement").eq("user_id",order.customer_user_id).eq("status","active"),values=new Set((active.data||[]).map(row=>String(row.entitlement))),tier=values.has("map_timeline_plus")?"timeline-plus":values.has("map_plus")?"plus":values.has("map_basic")?"map":null,user=await admin.auth.admin.getUserById(order.customer_user_id),metadata={...(user.data.user?.user_metadata||{}),product_tier:tier,purchase_status:tier?"paid":"refunded"};await admin.auth.admin.updateUserById(order.customer_user_id,{user_metadata:metadata})}
 const queued=await admin.from("customer_notifications").insert({order_id:order.id,customer_user_id:order.customer_user_id,recipient_email:order.customer_email,notification_type:"order_refunded",subject:`Refund issued for Memento House order ${String(order.id).slice(0,8).toUpperCase()}`,payload:{amount,currency:order.currency||"usd",reason:input.reason||"Full refund"}}).select("id").single();
 const delivery=await sendRefundEmail({recipient:order.customer_email,orderId:order.id,productName:item.displayName,amount,currency:order.currency||"usd"});if(queued.data?.id)await admin.from("customer_notifications").update(delivery.sent?{status:"sent",provider_message_id:delivery.id,sent_at:now}:{status:"failed",error_message:delivery.error}).eq("id",queued.data.id);
 await admin.from("order_events").insert({order_id:order.id,event_type:delivery.sent?"refund_email_sent":"refund_email_failed",actor_type:input.actorType,metadata:delivery.sent?{provider_message_id:delivery.id}:{message:delivery.error}});
 return{delivery,amount};
}
