import {createClient} from "@supabase/supabase-js";
import {sendAccountConfirmationEmail} from "../../../../lib/customer-email";
import {createConfirmationWatch} from "../../../../lib/confirmation-watch";
import {supabaseServerConfig} from "../../../../lib/server-config";

const attempts=new Map<string,{count:number;until:number}>();
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request:Request){
 const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim(),now=Date.now(),rate=attempts.get(ip);
 if(rate&&rate.until>now&&rate.count>=5)return Response.json({error:"Too many confirmation requests. Please wait a few minutes and try again."},{status:429});
 attempts.set(ip,{count:rate&&rate.until>now?rate.count+1:1,until:now+10*60_000});
 const body=await request.json().catch(()=>({})),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||""),returnTo=String(body.returnTo||"/account"),action=body.action==="resend"?"resend":"signup";
 if(!emailPattern.test(email)||(action==="signup"&&password.length<10))return Response.json({error:"Enter a valid email and a password of at least 10 characters."},{status:400});
 const {url,serviceRoleKey}=supabaseServerConfig();if(!serviceRoleKey)return Response.json({error:"Account confirmation is temporarily unavailable."},{status:503});
 const admin=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}}),site=(process.env.NEXT_PUBLIC_SITE_URL||"https://mementohouse.com").replace(/\/$/,""),next=returnTo.startsWith("/")&&!returnTo.startsWith("//")?returnTo:"/account";
 const redirectTo=`${site}/auth/callback?confirm=1&next=${encodeURIComponent(next)}`;
 const generated=action==="resend"
  ?await admin.auth.admin.generateLink({type:"magiclink",email,options:{redirectTo}})
  :await admin.auth.admin.generateLink({type:"signup",email,password,options:{redirectTo,data:{account_type:"customer",memento_email_confirmation_required:true,memento_email_confirmed_at:null}}});
 if(generated.error){
  console.error(JSON.stringify({level:"error",message:"account_confirmation_link_failed",action,status:generated.error.status||null,code:generated.error.code||null}));
  if(action==="resend")return Response.json({ok:true,message:"If an unconfirmed account exists, a fresh confirmation email is on its way."});
  if(/already|registered|exists/i.test(generated.error.message))return Response.json({existing:true,message:"An account already exists for this email. Request a fresh confirmation email below or sign in."},{status:409});
  return Response.json({error:generated.error.message},{status:400});
 }
 const actionLink=generated.data.properties?.action_link;if(!actionLink)return Response.json({error:"A confirmation link could not be created."},{status:502});
 const delivery=await sendAccountConfirmationEmail({recipient:email,confirmationUrl:actionLink});
 if(!delivery.sent){console.error(JSON.stringify({level:"error",message:"account_confirmation_delivery_failed",action,error:delivery.error||"Unknown provider error"}));return Response.json({error:action==="signup"?"Your account was created, but the confirmation email could not be delivered. Request a fresh confirmation email below.":"A fresh confirmation link could not be delivered. Please try again shortly."},{status:502})}
 console.info(JSON.stringify({level:"info",message:"account_confirmation_sent",action,deliveryId:delivery.id||null}));
 return Response.json({ok:true,confirmationToken:createConfirmationWatch(generated.data.user.id,serviceRoleKey),message:action==="resend"?"If an unconfirmed account exists, a fresh confirmation email is on its way.":undefined});
}
