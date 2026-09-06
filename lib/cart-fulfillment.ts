import type {SupabaseClient} from "@supabase/supabase-js";
import {fulfillPurchase} from "./fulfillment";
import {resolveCatalog} from "./product-catalog";
import {deliverOrderConfirmation} from "./order-notifications";
import {stripeServerConfig} from "./server-config";
import {paidCartItems} from "./cart-paid-items";

export async function fulfillCartCheckout(admin:SupabaseClient,session:any){
 const count=Number(session.metadata?.cart_count),userId=String(session.metadata?.customer_user_id||""),email=String(session.customer_details?.email||session.customer_email||"").toLowerCase();
 if(!Number.isInteger(count)||count<1||count>12||!userId||!email||session.payment_status!=="paid")throw new Error("Invalid paid cart metadata.");
 const key=session.livemode===false?stripeServerConfig().testSecretKey:stripeServerConfig().liveSecretKey;
 const response=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session.id)}/line_items?limit=100&expand[]=data.price.product`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(12000)});
 const lines=await response.json();if(!response.ok||lines.data?.length!==count)throw new Error("Could not verify all paid cart items.");
 const items=paidCartItems(session.metadata,lines.data,session.currency,session.amount_total),results=[];
 for(const[index,item]of items.entries()){
  const addons=item.addon==="none"?[]:[item.addon];resolveCatalog(item.product,item.tier,addons);
  const sourceId=index===0?session.id:`${session.id}:${index}`;
  const result=await fulfillPurchase(admin,{source:"stripe",sourceId,stripeSessionId:index===0?session.id:null,email,userId,name:session.customer_details?.name||"",product:item.product,tier:item.tier,addons,amount:item.amount,currency:session.currency,customizationId:item.customizationId||null,paymentIntentId:session.payment_intent,isTest:session.livemode===false});
  await deliverOrderConfirmation(admin,result.order,result.item.displayName,"stripe_cart");results.push({...result,cartItemId:item.id});
 }
 return results;
}
