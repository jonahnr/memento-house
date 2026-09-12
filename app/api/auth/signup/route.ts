import {createClient} from "@supabase/supabase-js";
import {sendAccountConfirmationEmail} from "../../../../lib/customer-email";
import {supabaseServerConfig} from "../../../../lib/server-config";

const attempts=new Map<string,{count:number;until:number}>();
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request:Request){
 const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim(),now=Date.now(),rate=attempts.get(ip);
 if(rate&&rate.until>now&&rate.count>=5)return Response.json({error:"Too many confirmation requests. Please wait a few minutes and try again."},{status:429});
 attempts.set(ip,{count:rate&&rate.until>now?rate.count+1:1,until:now+10*60_000});
 const body=await request.json().catch(()=>({})),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||""),returnTo=String(body.returnTo||"/account");
 if(!emailPattern.test(email)||password.length<10)return Response.json({error:"Enter a valid email and a password of at least 10 characters."},{status:400});
 const {url,serviceRoleKey}=supabaseServerConfig();if(!serviceRoleKey)return Response.json({error:"Account confirmation is temporarily unavailable."},{status:503});
 const admin=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}}),site=(process.env.NEXT_PUBLIC_SITE_URL||"https://mementohouse.com").replace(/\/$/,""),next=returnTo.startsWith("/")&&!returnTo.startsWith("//")?returnTo:"/account";
 const generated=await admin.auth.admin.generateLink({type:"signup",email,password,options:{redirectTo:`${site}/auth/callback?next=${encodeURIComponent(next)}`,data:{account_type:"customer"}}});
 if(generated.error){
  if(/already|registered|exists/i.test(generated.error.message))return Response.json({existing:true,message:"An account already exists for this email. Sign in or reset the password."});
  return Response.json({error:generated.error.message},{status:400});
 }
 const actionLink=generated.data.properties?.action_link;if(!actionLink)return Response.json({error:"A confirmation link could not be created."},{status:502});
 const delivery=await sendAccountConfirmationEmail({recipient:email,confirmationUrl:actionLink});
 if(!delivery.sent)return Response.json({error:"Your account was created, but the confirmation email could not be delivered. Use Resend confirmation or contact Memento House."},{status:502});
 return Response.json({ok:true});
}
