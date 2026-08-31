import {adminFailure,requireAdmin} from "../../../../lib/admin";
import {revokeRefundedOrder} from "../../../../lib/refund-lifecycle";

export async function POST(request:Request){
 const context=await requireAdmin(request);if(!context)return adminFailure(request);
 try{const body=await request.json(),id=String(body.id||""),reason=String(body.reason||"Full refund").trim().slice(0,500),current=await context.admin.from("orders").select("*").eq("id",id).single();if(current.error)throw current.error;const order=current.data,simulated=order.payment_status==="admin_bypass";if(order.payment_status==="refunded")return Response.json({error:"This order has already been refunded."},{status:409});
  let stripeRefundId="";
  if(!simulated){const secret=order.payment_status==="test_paid"?process.env.STRIPE_TEST_SECRET_KEY:process.env.STRIPE_SECRET_KEY;if(!secret)throw new Error(`${order.payment_status==="test_paid"?"STRIPE_TEST_SECRET_KEY":"STRIPE_SECRET_KEY"} is not configured.`);if(!order.stripe_payment_intent_id)throw new Error("This order has no Stripe PaymentIntent to refund.");const params=new URLSearchParams({payment_intent:order.stripe_payment_intent_id,reason:"requested_by_customer","metadata[order_id]":order.id,"metadata[admin_reason]":reason}),response=await fetch("https://api.stripe.com/v1/refunds",{method:"POST",headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":`refund-${order.id}`},body:params});const payload=await response.json().catch(()=>({})) as any;if(!response.ok)throw new Error(payload.error?.message||`Stripe refund failed (${response.status}).`);stripeRefundId=String(payload.id||"")}
  const result=await revokeRefundedOrder(context.admin,order,{actorType:"admin",actorId:context.user.id,reason,stripeRefundId});return Response.json({ok:true,simulated,...result})
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Refund failed."},{status:400})}
}
