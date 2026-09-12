import {requireAdmin} from "../../../../lib/admin";
import {resolveMapAccessOverride} from "../../../../lib/map-entitlement";
import {sendAccountConfirmationEmail} from "../../../../lib/customer-email";

const allowed=new Set(["automatic","off","map","plus","timeline-plus"]);

const entitlementTier=(values:string[])=>values.includes("map_timeline_plus")?"timeline-plus":values.includes("map_plus")?"plus":values.includes("map_basic")?"map":"none";

export async function GET(request:Request){
 const context=await requireAdmin(request);
 if(!context)return Response.json({error:"Administrator access is required."},{status:403});
 const users:any[]=[];let page=1;
 while(page<=20){const result=await context.admin.auth.admin.listUsers({page,perPage:100});if(result.error)return Response.json({error:result.error.message},{status:500});users.push(...result.data.users);if(result.data.users.length<100)break;page++}
 const entitlements=await context.admin.from("entitlements").select("user_id,entitlement,status").eq("status","active").in("entitlement",["map_basic","map_plus","map_timeline_plus"]);
 if(entitlements.error)return Response.json({error:entitlements.error.message},{status:500});
 const byUser=new Map<string,string[]>();for(const row of entitlements.data||[])byUser.set(row.user_id,[...(byUser.get(row.user_id)||[]),row.entitlement]);
 const weddings=await context.admin.from("weddings").select("id,owner_user_id,slug,title,partner_one_name,partner_two_name,wedding_date,created_at").order("created_at",{ascending:false});if(weddings.error)return Response.json({error:weddings.error.message},{status:500});
 const mapsByUser=new Map<string,any[]>();for(const row of weddings.data||[])mapsByUser.set(row.owner_user_id,[...(mapsByUser.get(row.owner_user_id)||[]),{id:row.id,slug:row.slug,title:row.title,names:[row.partner_one_name,row.partner_two_name].filter(Boolean).join(" & "),eventDate:row.wedding_date}]);
 const customers=users.filter(user=>user.email).map(user=>{const override=resolveMapAccessOverride(user.user_metadata),automaticTier=entitlementTier(byUser.get(user.id)||[]),effectiveTier=override==="automatic"?automaticTier:override==="off"?"none":override,maps=mapsByUser.get(user.id)||[];return{id:user.id,email:user.email,createdAt:user.created_at,lastSignInAt:user.last_sign_in_at,emailConfirmedAt:user.email_confirmed_at||user.confirmed_at||null,override,automaticTier,effectiveTier,timelineStatus:effectiveTier==="timeline-plus"?"Active":override==="off"?"Paused":automaticTier==="timeline-plus"?"Active":"Not included",maps}}).sort((a,b)=>a.email.localeCompare(b.email));
 return Response.json({customers},{headers:{"Cache-Control":"no-store"}});
}

export async function DELETE(request:Request){
 const context=await requireAdmin(request);if(!context)return Response.json({error:"Administrator access is required."},{status:403});
 const body=await request.json().catch(()=>({})),id=String(body.id||""),email=String(body.email||"").trim().toLowerCase(),confirmation=String(body.confirmation||"").trim().toLowerCase();
 if(!id||!email||confirmation!==email)return Response.json({error:"Type the customer email exactly to confirm deletion."},{status:400});
 if(id===context.user.id)return Response.json({error:"You cannot delete the administrator account currently in use."},{status:400});
 const user=await context.admin.auth.admin.getUserById(id);if(user.error){if(user.error.status===404)return Response.json({ok:true,email,alreadyDeleted:true});return Response.json({error:"Customer identity could not be verified."},{status:500})}if(user.data.user?.email?.toLowerCase()!==email)return Response.json({error:"Customer identity did not match."},{status:404});
 const cleanup=await Promise.all([
  context.admin.from("weddings").delete().eq("owner_user_id",id),context.admin.from("entitlements").delete().eq("user_id",id),context.admin.from("questionnaires").delete().eq("user_id",id),context.admin.from("checkout_customizations").delete().eq("customer_user_id",id),context.admin.from("customer_support_notes").delete().eq("customer_user_id",id),context.admin.from("customer_notifications").update({customer_user_id:null}).eq("customer_user_id",id),context.admin.from("orders").update({customer_user_id:null}).eq("customer_user_id",id)
 ]);
 const cleanupError=cleanup.find(result=>result.error&&!(["42P01","PGRST205"].includes(result.error.code||"")))?.error;if(cleanupError){console.error(JSON.stringify({level:"error",message:"customer_cleanup_failed",userId:id,code:cleanupError.code||null,error:cleanupError.message}));return Response.json({error:"Customer records could not be cleared before account deletion."},{status:500})}
 let deletion=await context.admin.auth.admin.deleteUser(id,false);if(deletion.error){console.warn(JSON.stringify({level:"warn",message:"customer_hard_delete_failed",userId:id,status:deletion.error.status||null,error:deletion.error.message}));deletion=await context.admin.auth.admin.deleteUser(id,true)}if(deletion.error){console.error(JSON.stringify({level:"error",message:"customer_delete_failed",userId:id,status:deletion.error.status||null,error:deletion.error.message}));return Response.json({error:"Supabase could not delete this customer account."},{status:500})}
 return Response.json({ok:true,email});
}

export async function POST(request:Request){
 const context=await requireAdmin(request);
 if(!context)return Response.json({error:"Administrator access is required."},{status:403});
 const body=await request.json().catch(()=>({})),email=String(body.email||"").trim().toLowerCase(),access=String(body.access||"automatic"),action=String(body.action||"");
 if(!email||(action!=="resend-confirmation"&&!allowed.has(access)))return Response.json({error:"Enter a customer email and choose a valid access setting."},{status:400});
 let page=1,target:any=null;
 while(page<=20&&!target){
  const result=await context.admin.auth.admin.listUsers({page,perPage:100});
  if(result.error)return Response.json({error:result.error.message},{status:500});
  target=result.data.users.find(user=>user.email?.toLowerCase()===email)||null;
  if(result.data.users.length<100)break;
  page++;
 }
 if(!target)return Response.json({error:"No Memento House account was found for that email."},{status:404});
 if(action==="resend-confirmation"){
  if(target.email_confirmed_at||target.confirmed_at)return Response.json({error:"This customer email is already confirmed."},{status:400});
  const site=(process.env.NEXT_PUBLIC_SITE_URL||"https://mementohouse.com").replace(/\/$/,""),link=await context.admin.auth.admin.generateLink({type:"magiclink",email,options:{redirectTo:`${site}/auth/callback?confirm=1&next=${encodeURIComponent("/account")}`}});
  if(link.error||!link.data.properties?.action_link)return Response.json({error:link.error?.message||"A confirmation link could not be created."},{status:500});
  const delivery=await sendAccountConfirmationEmail({recipient:email,confirmationUrl:link.data.properties.action_link});if(!delivery.sent)return Response.json({error:delivery.error||"Confirmation email could not be delivered."},{status:502});
  return Response.json({ok:true,email,action});
 }
 const metadata={...(target.user_metadata||{})};
 if(access==="automatic")metadata.map_access_override=null;
 else metadata.map_access_override=access;
 if(["map","plus","timeline-plus"].includes(access))metadata.product_tier=access;
 const update=await context.admin.auth.admin.updateUserById(target.id,{user_metadata:metadata});
 if(update.error)return Response.json({error:update.error.message},{status:500});
 return Response.json({ok:true,email,access});
}
