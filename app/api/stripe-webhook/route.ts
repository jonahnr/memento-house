import {createClient} from "@supabase/supabase-js";

const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,"0")).join("");
const safeEqual=(a:string,b:string)=>{if(a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0};

export async function POST(request:Request){
 const secret=process.env.STRIPE_WEBHOOK_SECRET,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!secret||!serviceKey||!url)return new Response("Webhook is not configured",{status:503});
 const body=await request.text(),signature=request.headers.get("stripe-signature")||"",parts=Object.fromEntries(signature.split(",").map(v=>v.split("="))),signed=`${parts.t}.${body}`;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]),expected=hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(signed)));
 if(!parts.v1||!safeEqual(expected,parts.v1))return new Response("Invalid signature",{status:400});
 const event=JSON.parse(body),session=event.data?.object;if(event.type!=="checkout.session.completed"||session?.payment_status!=="paid"||session?.metadata?.product!=="map")return new Response("ok");
 const email=String(session.customer_details?.email||"").toLowerCase(),tier=String(session.metadata?.tier||"map");if(!email)return new Response("No customer email",{status:400});
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});let page=1,user:any=null;while(!user&&page<20){const result=await admin.auth.admin.listUsers({page,perPage:100});if(result.error)return new Response(result.error.message,{status:500});user=result.data.users.find(u=>u.email?.toLowerCase()===email);if(result.data.users.length<100)break;page++}
 if(!user)return new Response("Account not found for checkout email",{status:202});const result=await admin.auth.admin.updateUserById(user.id,{user_metadata:{...user.user_metadata,product_tier:tier}});return result.error?new Response(result.error.message,{status:500}):new Response("ok");
}
