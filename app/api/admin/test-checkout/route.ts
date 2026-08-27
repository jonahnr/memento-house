import {adminFailure,requireAdmin} from "../../../../lib/admin";
import {ADDONS,resolveCatalog} from "../../../../lib/product-catalog";
import {requestOrigin} from "../../../../lib/site-url";
import {stripeServerConfig} from "../../../../lib/server-config";

export async function POST(request:Request){
 const context=await requireAdmin(request);if(!context)return adminFailure(request);
 const origin=requestOrigin(request);
 const key=stripeServerConfig().testSecretKey;if(!key)return Response.json({error:"STRIPE_TEST_SECRET_KEY is not available to this deployment. Confirm its Preview/Production scope and redeploy."},{status:503});
 try{
  const body=await request.json(),product=String(body.product||""),tier=String(body.tier||""),addon=String(body.addon||"none"),addons=addon==="none"?[]:[addon],item=resolveCatalog(product,tier,addons),addonTotal=addons.reduce((sum,id)=>sum+((ADDONS as Record<string,{price:number}>)[id]?.price||0),0);
  const params=new URLSearchParams({mode:"payment",success_url:`${origin}/order/success?session_id={CHECKOUT_SESSION_ID}&test=1`,cancel_url:`${origin}/order?product=${encodeURIComponent(product)}&tier=${encodeURIComponent(tier)}`,customer_email:context.user.email||"",billing_address_collection:"required","line_items[0][quantity]":"1","line_items[0][price_data][currency]":"usd","line_items[0][price_data][unit_amount]":String(item.price+addonTotal),"line_items[0][price_data][product_data][name]":`TEST · ${item.displayName}${addons.length?` + ${addons.map(id=>(ADDONS as Record<string,{name:string}>)[id].name).join(", ")}`:""}`,"metadata[catalog_key]":item.key,"metadata[product]":item.productId,"metadata[tier]":item.tierId,"metadata[addons]":addons.join(","),"metadata[test_checkout]":"true"});
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/x-www-form-urlencoded"},body:params});
  if(!response.ok){const failure=await response.json().catch(()=>null) as {error?:{message?:string}}|null;return Response.json({error:failure?.error?.message||"Stripe test checkout could not be started."},{status:502})}
  const session=await response.json() as {url?:string};if(!session.url)throw new Error("Stripe did not return a checkout URL");return Response.json({url:session.url});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Test checkout failed"},{status:400})}
}
