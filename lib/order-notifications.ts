import type {SupabaseClient} from "@supabase/supabase-js";
import {sendOrderConfirmationEmail} from "./customer-email";

export async function deliverOrderConfirmation(admin:SupabaseClient,order:any,productName:string,actorType="system"){
 const existing=await admin.from("customer_notifications").select("id,status").eq("order_id",order.id).eq("notification_type","order_confirmation").maybeSingle();
 if(existing.data?.status==="sent")return{sent:true,alreadySent:true};
 let notificationId=existing.data?.id;
 if(!notificationId){const queued=await admin.from("customer_notifications").insert({order_id:order.id,customer_user_id:order.customer_user_id,recipient_email:order.customer_email,notification_type:"order_confirmation",subject:`Memento House order ${String(order.id).slice(0,8).toUpperCase()} confirmed`,payload:{product_name:productName}}).select("id").single();notificationId=queued.data?.id}
 const delivery=await sendOrderConfirmationEmail({recipient:order.customer_email,orderId:order.id,productName});
 if(notificationId)await admin.from("customer_notifications").update(delivery.sent?{status:"sent",provider_message_id:delivery.id,sent_at:new Date().toISOString(),error_message:null}:{status:"failed",error_message:delivery.error}).eq("id",notificationId);
 await admin.from("order_events").insert({order_id:order.id,event_type:delivery.sent?"order_confirmation_sent":"order_confirmation_email_failed",actor_type:actorType,metadata:delivery.sent?{provider_message_id:delivery.id}:{message:delivery.error}});
 return delivery;
}
