import {createClient} from "@supabase/supabase-js";
import {ADDONS,resolveCatalog} from "../../../lib/product-catalog";
import {requireUser} from "../../../lib/request-user";
import {requestOrigin} from "../../../lib/site-url";
import {stripeServerConfig,supabaseServerConfig} from "../../../lib/server-config";
export const maxDuration=30;
type StripeFailure={error?:{code?:string;message?:string;type?:string}};
async function createCheckoutSession(key:string,body:URLSearchParams){
 try{
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(12000)});
  const payload=await response.json().catch(()=>null) as ({url?:string}&StripeFailure)|null;
  return{response,payload};
 }catch(error){return{response:null,payload:{error:{message:error instanceof Error?error.message:"Stripe did not respond."}} as StripeFailure}}
}
export async function POST(request:Request){
 const origin=requestOrigin(request);
 const identity=await requireUser(request);if(!identity)return Response.json({error:"Sign in or create your Memento House account before checkout."},{status:401});
 const form=await request.formData(),product=String(form.get("product")||""),tier=String(form.get("tier")||""),addon=String(form.get("addon")||"none"),addons=addon==="none"?[]:[addon];let item;
 try{item=resolveCatalog(product,tier,addons)}catch(error){return new Response(error instanceof Error?error.message:"Invalid product selection",{status:400})}
 const raw=String(form.get("customization")||"");
 if(product==="unity"&&!raw)return new Response("Complete and save the Unity Tile builder before checkout.",{status:400});
 const key=stripeServerConfig().liveSecretKey;if(!key)return Response.json({error:"STRIPE_SECRET_KEY is not available to this deployment. Confirm its Preview/Production scope and redeploy."},{status:503});
 let customizationId="";
 const server=supabaseServerConfig();if(raw&&raw.length<=250_000&&server.serviceRoleKey){try{const payload=JSON.parse(raw),admin=createClient(server.url,server.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}}),saved=await Promise.race([admin.from("checkout_customizations").insert({product,tier,payload}).select("id").single(),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("Customization save timed out")),3000))]);if(!saved.error)customizationId=saved.data.id}catch(error){console.error("Checkout customization could not be persisted before Stripe",error)}}
 const addonTotal=addons.reduce((sum,id)=>sum+((ADDONS as Record<string,{price:number}>)[id]?.price||0),0),priceId=process.env[item.stripePriceEnv];
 const body=new URLSearchParams({mode:"payment",success_url:`${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/order?product=${encodeURIComponent(product)}&tier=${encodeURIComponent(tier)}`,customer_creation:"always",customer_email:identity.user.email||"","client_reference_id":identity.user.id,"line_items[0][quantity]":"1","billing_address_collection":"required",allow_promotion_codes:"true","metadata[catalog_key]":item.key,"metadata[product]":item.productId,"metadata[tier]":item.tierId,"metadata[addons]":addons.join(","),"metadata[customization_id]":customizationId,"metadata[customer_user_id]":identity.user.id});
 if(process.env.STRIPE_AUTOMATIC_TAX_ENABLED==="true")body.set("automatic_tax[enabled]","true");
 const setInlinePrice=()=>{body.delete("line_items[0][price]");body.set("line_items[0][price_data][currency]","usd");body.set("line_items[0][price_data][unit_amount]",String(item.price+addonTotal));body.set("line_items[0][price_data][product_data][name]",item.displayName+(addons.length?` + ${addons.map(id=>(ADDONS as any)[id].name).join(", ")}`:""))};
 if(priceId&&!addonTotal)body.set("line_items[0][price]",priceId);else setInlinePrice();
 let attempt=await createCheckoutSession(key,body);
 const stalePrice=Boolean(priceId&&!addonTotal&&!attempt.response?.ok&&(attempt.payload?.error?.code==="resource_missing"||/no such price/i.test(attempt.payload?.error?.message||"")));
 if(stalePrice){console.warn("Configured Stripe price is unavailable in this mode; retrying with the catalog amount",{catalogKey:item.key,priceEnv:item.stripePriceEnv});setInlinePrice();attempt=await createCheckoutSession(key,body)}
 if(!attempt.response)return Response.json({error:"Stripe did not respond in time. Please try again; no charge was created."},{status:504});
 if(!attempt.response.ok){console.error("Stripe checkout session failed",{catalogKey:item.key,status:attempt.response.status,code:attempt.payload?.error?.code,type:attempt.payload?.error?.type,message:attempt.payload?.error?.message,requestId:attempt.response.headers.get("request-id")});return Response.json({error:attempt.payload?.error?.message||"Secure checkout could not be started. No charge was created."},{status:502})}
 if(!attempt.payload?.url)return Response.json({error:"Stripe created a session without a checkout address. Please try again."},{status:502});
 return Response.json({url:attempt.payload.url},{headers:{"Cache-Control":"no-store"}})
}
