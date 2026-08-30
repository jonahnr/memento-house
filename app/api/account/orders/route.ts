import {requireUser} from "../../../../lib/request-user";

export async function GET(request:Request){
 const context=await requireUser(request);if(!context)return Response.json({error:"Sign in to view your orders."},{status:401});
 const result=await context.admin.from("orders").select("id,created_at,customer_email,product,tier,catalog_key,amount_total,currency,order_status,questionnaire_status,entitlement_status,tracking_number,tracking_url,shipping_carrier").eq("customer_user_id",context.user.id).is("archived_at",null).order("created_at",{ascending:false});
 if(result.error)return Response.json({error:result.error.message},{status:500});
 const orders=result.data||[],ids=orders.map(order=>order.id),mapAccessOverride=String(context.user.user_metadata?.map_access_override||"automatic"),wedding=await context.admin.from("weddings").select("slug,partner_one_name,partner_two_name,wedding_date").eq("owner_user_id",context.user.id).maybeSingle();if(!ids.length)return Response.json({email:context.user.email,mapAccessOverride,wedding:wedding.data,orders:[]});
 const[proofs,events]=await Promise.all([context.admin.from("order_proofs").select("id,order_id,status,version,created_at,file_name").in("order_id",ids).order("version",{ascending:false}),context.admin.from("order_events").select("id,order_id,event_type,to_status,created_at").in("order_id",ids).order("created_at",{ascending:false})]);
 return Response.json({email:context.user.email,mapAccessOverride,wedding:wedding.data,orders:orders.map(order=>({...order,proofs:(proofs.data||[]).filter(proof=>proof.order_id===order.id),order_events:(events.data||[]).filter(event=>event.order_id===order.id)}))});
}
