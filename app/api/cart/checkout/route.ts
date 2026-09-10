import {requireUser} from "../../../../lib/request-user";
import {validateCart,cartPrice} from "../../../../lib/cart";
import {resolveCatalog} from "../../../../lib/product-catalog";
import {stripeServerConfig} from "../../../../lib/server-config";
import {requestOrigin} from "../../../../lib/site-url";
export const maxDuration=30;
export async function POST(request:Request){
 const identity=await requireUser(request);if(!identity)return Response.json({error:"Sign in to use your cart."},{status:401});
 try{
  const text=await request.text();if(text.length>3_100_000)return Response.json({error:"Your cart is too large."},{status:413});
  const items=validateCart(JSON.parse(text).items),key=stripeServerConfig().liveSecretKey;if(!key)return Response.json({error:"Secure checkout is temporarily unavailable."},{status:503});
  const origin=requestOrigin(request),body=new URLSearchParams({mode:"payment",success_url:`${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/cart`,customer_creation:"always",customer_email:identity.user.email||"",client_reference_id:identity.user.id,billing_address_collection:"required",allow_promotion_codes:"true","metadata[customer_user_id]":identity.user.id,"metadata[cart_count]":String(items.length)});
  if(process.env.STRIPE_AUTOMATIC_TAX_ENABLED==="true")body.set("automatic_tax[enabled]","true");
  for(const[index,item]of items.entries()){
   let customizationId="";if(item.customization){const saved=await identity.admin.from("checkout_customizations").insert({product:item.product,tier:item.tier,customer_user_id:identity.user.id,payload:JSON.parse(item.customization)}).select("id").single();if(saved.error)throw new Error("Your design could not be saved. Please try again.");customizationId=saved.data.id;}
   const catalog=resolveCatalog(item.product,item.tier),prefix=`line_items[${index}]`;
   body.set(`${prefix}[price_data][product_data][metadata][cart_item_id]`,item.id);body.set(`${prefix}[quantity]`,"1");body.set(`${prefix}[price_data][currency]`,"usd");body.set(`${prefix}[price_data][unit_amount]`,String(cartPrice(item)));body.set(`${prefix}[price_data][product_data][name]`,catalog.displayName+(item.addon!=="none"?` + ${item.addon==="open-5"?"5":"10"} Open When cards`:""));
   body.set(`metadata[cart_item_${index}]`,JSON.stringify({id:item.id,product:item.product,tier:item.tier,mapType:item.mapType,addon:item.addon,customizationId}));
  }
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(12000)}),session=await response.json();if(!response.ok||!session.url)throw new Error(session.error?.message||"Secure checkout could not be opened.");
  return Response.json({url:session.url},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Invalid cart."},{status:400})}
}
