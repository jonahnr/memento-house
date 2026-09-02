import {createClient} from "@supabase/supabase-js";
import {deliverOrderConfirmation} from "../../../lib/order-notifications";
import {fulfillPurchase} from "../../../lib/fulfillment";
import {resolveCatalog} from "../../../lib/product-catalog";
import {stripeServerConfig,supabaseServerConfig} from "../../../lib/server-config";

async function recoverPaidCheckout(admin:any,sessionId:string){
 const stripe=stripeServerConfig(),key=sessionId.startsWith("cs_test_")?stripe.testSecretKey:stripe.liveSecretKey;
 if(!key)return null;
 const response=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,{headers:{Authorization:`Bearer ${key}`},cache:"no-store",signal:AbortSignal.timeout(10000)});
 if(!response.ok){console.error("Order recovery could not retrieve Stripe Checkout Session",{sessionId,status:response.status,requestId:response.headers.get("request-id")});return null}
 const session=await response.json();
 if(session.payment_status!=="paid")return null;
 const email=String(session.customer_details?.email||session.customer_email||"").toLowerCase(),product=String(session.metadata?.product||""),tier=String(session.metadata?.tier||""),addons=String(session.metadata?.addons||"").split(",").filter(Boolean),item=resolveCatalog(product,tier,addons);
 if(!email||session.metadata?.catalog_key!==item.key)throw new Error("Paid Checkout Session has invalid fulfillment metadata");
 console.info("Recovering paid Checkout Session from order status",{sessionId,catalogKey:item.key});
 const result=await fulfillPurchase(admin,{source:"stripe",sourceId:sessionId,email,name:String(session.customer_details?.name||""),userId:String(session.metadata?.customer_user_id||session.client_reference_id||"")||null,product,tier,addons,amount:Number(session.amount_total||0),currency:String(session.currency||"usd"),customizationId:String(session.metadata?.customization_id||"")||null,paymentIntentId:String(session.payment_intent||"")||null,isTest:session.metadata?.test_checkout==="true"});
 const delivery=await deliverOrderConfirmation(admin,result.order,result.item.displayName,"order_recovery");
 if(!delivery.sent)console.error("Recovered order confirmation email failed",{orderId:result.order.id,error:"error" in delivery?delivery.error:"Unknown delivery error"});
 return result.order;
}

export async function GET(request:Request){
 const sessionId=new URL(request.url).searchParams.get("session_id")||"";
 if(!/^cs_(?:test_|live_)?[A-Za-z0-9_]+$/.test(sessionId))return Response.json({status:"invalid"},{status:400});
 const{url,serviceRoleKey:key}=supabaseServerConfig();
 if(!url||!key){console.error("Order status is missing Supabase server configuration");return Response.json({status:"unavailable"},{status:503})}
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 let result=await admin.from("orders").select("id,product,tier,order_status,questionnaire_status,customer_email").eq("stripe_session_id",sessionId).maybeSingle();
 if(result.error){console.error("Order status database lookup failed",{sessionId,error:result.error.message});return Response.json({status:"error"},{status:500})}
 if(!result.data){try{await recoverPaidCheckout(admin,sessionId);result=await admin.from("orders").select("id,product,tier,order_status,questionnaire_status,customer_email").eq("stripe_session_id",sessionId).maybeSingle()}catch(error){console.error("Paid order recovery failed",{sessionId,error:error instanceof Error?error.message:String(error)});return Response.json({status:"processing"})}}
 if(!result.data)return Response.json({status:"processing"});
 const item=resolveCatalog(result.data.product,result.data.tier);
 return Response.json({status:"ready",orderId:result.data.id,orderNumber:result.data.id.slice(0,8).toUpperCase(),product:item.productName,tier:item.displayName,name:item.displayName,orderStatus:result.data.order_status,questionnaireType:item.questionnaireType,nextSteps:item.nextSteps,hasQuestionnaire:item.questionnaire.length>0});
}
