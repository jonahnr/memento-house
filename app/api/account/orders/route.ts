import {requireUser} from "../../../../lib/request-user";

export async function GET(request:Request){
 const context=await requireUser(request);if(!context)return Response.json({error:"Sign in to view your orders."},{status:401});
 const result=await context.admin.from("orders").select("id,created_at,product,tier,catalog_key,amount_total,currency,order_status,questionnaire_status,tracking_number,tracking_url,shipping_carrier,proofs(id,status,version,created_at),order_events(id,event_type,to_status,created_at)").eq("customer_user_id",context.user.id).order("created_at",{ascending:false});
 if(result.error)return Response.json({error:result.error.message},{status:500});
 return Response.json({email:context.user.email,orders:result.data||[]});
}
