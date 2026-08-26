type ShipmentEmail={recipient:string;orderId:string;carrier:string;trackingNumber:string;trackingUrl?:string};

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));

export async function sendShipmentEmail(message:ShipmentEmail){
  const apiKey=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL||"Memento House <orders@mementohouse.com>";
  if(!apiKey)return {sent:false,error:"RESEND_API_KEY is not configured"};
  const carrier=escapeHtml(message.carrier),tracking=escapeHtml(message.trackingNumber),trackingUrl=message.trackingUrl?escapeHtml(message.trackingUrl):"";
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","Idempotency-Key":`shipment-${message.orderId}-${message.trackingNumber}`},body:JSON.stringify({
    from,to:[message.recipient],reply_to:process.env.RESEND_REPLY_TO||"jonahnr@gmail.com",subject:"Your Memento House order is on the way",
    html:`<div style="font-family:Georgia,serif;color:#282621;max-width:600px;margin:auto;padding:36px"><p style="color:#a77b3f;letter-spacing:.18em;font:12px Arial,sans-serif">MEMENTO HOUSE</p><h1 style="font-weight:400">Your keepsake is on its way.</h1><p>Your order has been handed to ${carrier}.</p><p><strong>Tracking number:</strong> ${tracking}</p>${trackingUrl?`<p><a href="${trackingUrl}" style="display:inline-block;background:#a77b3f;color:white;text-decoration:none;padding:14px 22px">Track your shipment</a></p>`:""}<p style="margin-top:38px;color:#786f64">Made for the moment. Kept for a lifetime.</p></div>`,
    text:`Your Memento House order is on its way. Carrier: ${message.carrier}. Tracking number: ${message.trackingNumber}.${message.trackingUrl?` Track it at ${message.trackingUrl}`:""}`,
  })});
  const payload=await response.json().catch(()=>({})) as {id?:string;message?:string};
  return response.ok&&payload.id?{sent:true,id:payload.id}:{sent:false,error:payload.message||`Resend returned ${response.status}`};
}
