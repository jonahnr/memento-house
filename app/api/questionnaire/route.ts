import {createClient} from "@supabase/supabase-js";
import {resolveCatalog} from "../../../lib/product-catalog";
import {supabaseServerConfig} from "../../../lib/server-config";

type RequestContext={admin:any;user:{id:string;email?:string}};

async function context(request:Request):Promise<RequestContext|Response>{
 const{url,serviceRoleKey}=supabaseServerConfig();
 if(!serviceRoleKey)return Response.json({error:"Questionnaire services are not configured for this deployment."},{status:503});
 const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return Response.json({error:"Please sign in again to open this questionnaire."},{status:401});
 const admin=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const auth=await admin.auth.getUser(token);
 if(auth.error||!auth.data.user)return Response.json({error:"Your sign-in session expired. Please sign in again."},{status:401});
 return{admin,user:{id:auth.data.user.id,email:auth.data.user.email}};
}

async function ownedOrder(ctx:RequestContext,orderId:string){
 if(!orderId)return{error:Response.json({error:"No order was selected for this questionnaire."},{status:400})};
 const result=await ctx.admin.from("orders").select("id,customer_user_id,customer_email,product,tier,catalog_key,customization_id").eq("id",orderId).maybeSingle();
 if(result.error)return{error:Response.json({error:`Order lookup failed: ${result.error.message}`},{status:500})};
 if(!result.data)return{error:Response.json({error:"This order could not be found."},{status:404})};
 const order=result.data;
 if(order.customer_user_id===ctx.user.id)return{order};
 const sameEmail=Boolean(ctx.user.email&&order.customer_email&&ctx.user.email.toLowerCase()===String(order.customer_email).toLowerCase());
 if(!order.customer_user_id&&sameEmail){
  const claimed=await ctx.admin.from("orders").update({customer_user_id:ctx.user.id,updated_at:new Date().toISOString()}).eq("id",orderId).is("customer_user_id",null);
  if(claimed.error)return{error:Response.json({error:`This order could not be connected to your account: ${claimed.error.message}`},{status:500})};
  return{order:{...order,customer_user_id:ctx.user.id}};
 }
 return{error:Response.json({error:"This order is connected to a different account."},{status:403})};
}

function catalogFor(order:{product:string;tier:string;catalog_key?:string|null}){
 const[product,tier]=String(order.catalog_key||"").split(":");
 return resolveCatalog(product||order.product,tier||order.tier);
}

export async function GET(request:Request){
 const auth=await context(request);if(auth instanceof Response)return auth;
 const orderId=new URL(request.url).searchParams.get("order")||"",lookup=await ownedOrder(auth,orderId);if(lookup.error)return lookup.error;
 const order=lookup.order!,item=catalogFor(order);
 if(!item.questionnaire.length)return Response.json({error:"This order does not require a questionnaire."},{status:400});
 let result=await auth.admin.from("questionnaires").select("*").eq("order_id",orderId).maybeSingle();
 if(result.error)return Response.json({error:`Questionnaire lookup failed: ${result.error.message}`},{status:500});
 if(result.data&&result.data.user_id!==auth.user.id)result=await auth.admin.from("questionnaires").update({user_id:auth.user.id,updated_at:new Date().toISOString()}).eq("id",result.data.id).select("*").single();
 if(!result.data&&!result.error){
  result=await auth.admin.from("questionnaires").insert({order_id:orderId,user_id:auth.user.id,questionnaire_type:item.questionnaireType,schema_version:1,status:"not_started"}).select("*").single();
  if(result.error?.code==="23505")result=await auth.admin.from("questionnaires").select("*").eq("order_id",orderId).single();
 }
 if(result.error||!result.data)return Response.json({error:result.error?.message||"Questionnaire could not be prepared."},{status:500});
 let answers=result.data.answers||{};
 if(order.customization_id){const saved=await auth.admin.from("checkout_customizations").select("payload").eq("id",order.customization_id).maybeSingle();answers={...(saved.data?.payload||{}),...answers}}
 return Response.json({questionnaire:{...result.data,answers},item:{name:item.displayName,fields:item.questionnaire,nextSteps:item.nextSteps}});
}

export async function PUT(request:Request){
 const auth=await context(request);if(auth instanceof Response)return auth;
 const body=await request.json(),orderId=String(body.orderId||""),answers=body.answers&&typeof body.answers==="object"?body.answers:{},submit=body.submit===true;
 const lookup=await ownedOrder(auth,orderId);if(lookup.error)return lookup.error;
 const current=await auth.admin.from("questionnaires").select("id,user_id").eq("order_id",orderId).maybeSingle();
 if(current.error||!current.data)return Response.json({error:current.error?.message||"Questionnaire not found."},{status:404});
 if(current.data.user_id!==auth.user.id)await auth.admin.from("questionnaires").update({user_id:auth.user.id}).eq("id",current.data.id);
 const item=catalogFor(lookup.order!),allowed=new Set(item.questionnaire.map(f=>f.id)),clean=Object.fromEntries(Object.entries(answers).filter(([key,value])=>allowed.has(key)&&String(value??"").length<=4000));
 if(submit){const missing=item.questionnaire.filter(f=>f.required&&!String(clean[f.id]??"").trim());if(missing.length)return Response.json({error:`Please complete: ${missing.map(x=>x.label).join(", ")}`},{status:400})}
 const now=new Date().toISOString(),status=submit?"submitted":"in_progress",updated=await auth.admin.from("questionnaires").update({answers:clean,status,started_at:now,submitted_at:submit?now:null,updated_at:now}).eq("id",current.data.id).select().single();
 if(updated.error)return Response.json({error:updated.error.message},{status:500});
 const orderUpdate=await auth.admin.from("orders").update({questionnaire_status:status,order_status:submit?"proof_ready":"awaiting_customer_information",questionnaire_started_at:now,updated_at:now}).eq("id",orderId);
 if(orderUpdate.error)return Response.json({error:`Questionnaire saved, but the order could not be advanced: ${orderUpdate.error.message}`},{status:500});
 return Response.json({questionnaire:updated.data});
}
