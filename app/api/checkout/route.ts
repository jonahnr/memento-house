import {createClient} from "@supabase/supabase-js";
import {ADDONS,resolveCatalog} from "../../../lib/product-catalog";
import {requireUser} from "../../../lib/request-user";
import {requestOrigin} from "../../../lib/site-url";
import {stripeServerConfig,supabaseServerConfig} from "../../../lib/server-config";
export async function POST(request:Request){
 const origin=requestOrigin(request);
 const identity=await requireUser(request);if(!identity)return Response.json({error:"Sign in or create your Memento House account before checkout."},{status:401});
 const form=await request.formData(),product=String(form.get("product")||""),tier=String(form.get("tier")||""),addon=String(form.get("addon")||"none"),addons=addon==="none"?[]:[addon];let item;
 try{item=resolveCatalog(product,tier,addons)}catch(error){return new Response(error instanceof Error?error.message:"Invalid product selection",{status:400})}
 const raw=String(form.get("customization")||"");
 if(product==="unity"&&!raw)return new Response("Complete and save the Unity Tile builder before checkout.",{status:400});
 const key=stripeServerConfig().liveSecretKey;if(!key)return Response.json({error:"STRIPE_SECRET_KEY is not available to this deployment. Confirm its Preview/Production scope and redeploy."},{status:503});
 let customizationId="";
 const server=supabaseServerConfig();if(raw&&raw.length<=250_000&&server.serviceRoleKey){try{const payload=JSON.parse(raw),admin=createClient(server.url,server.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}}),saved=await admin.from("checkout_customizations").insert({product,tier,payload}).select("id").single();if(!saved.error)customizationId=saved.data.id}catch{}}
 const addonTotal=addons.reduce((sum,id)=>sum+((ADDONS as Record<string,{price:number}>)[id]?.price||0),0),priceId=process.env[item.stripePriceEnv];
 const body=new URLSearchParams({mode:"payment",success_url:`${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/order?product=${encodeURIComponent(product)}&tier=${encodeURIComponent(tier)}`,customer_creation:"always",customer_email:identity.user.email||"","client_reference_id":identity.user.id,"line_items[0][quantity]":"1","billing_address_collection":"required",allow_promotion_codes:"true","metadata[catalog_key]":item.key,"metadata[product]":item.productId,"metadata[tier]":item.tierId,"metadata[addons]":addons.join(","),"metadata[customization_id]":customizationId,"metadata[customer_user_id]":identity.user.id});
 if(priceId&&!addonTotal)body.set("line_items[0][price]",priceId);else{body.set("line_items[0][price_data][currency]","usd");body.set("line_items[0][price_data][unit_amount]",String(item.price+addonTotal));body.set("line_items[0][price_data][product_data][name]",item.displayName+(addons.length?` + ${addons.map(id=>(ADDONS as any)[id].name).join(", ")}`:""))}
 const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/x-www-form-urlencoded"},body});if(!response.ok){const failure=await response.json().catch(()=>null) as {error?:{message?:string}}|null;return Response.json({error:failure?.error?.message||"Secure checkout could not be started."},{status:502})}const session=await response.json() as {url:string};return Response.json({url:session.url})
}
