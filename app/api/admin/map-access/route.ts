import {requireAdmin} from "../../../../lib/admin";
import {resolveMapAccessOverride} from "../../../../lib/map-entitlement";

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
 const customers=users.filter(user=>user.email).map(user=>{const override=resolveMapAccessOverride(user.user_metadata),automaticTier=entitlementTier(byUser.get(user.id)||[]),effectiveTier=override==="automatic"?automaticTier:override==="off"?"none":override;return{id:user.id,email:user.email,createdAt:user.created_at,lastSignInAt:user.last_sign_in_at,override,automaticTier,effectiveTier,timelineStatus:effectiveTier==="timeline-plus"?"Active":override==="off"?"Paused":automaticTier==="timeline-plus"?"Active":"Not included"}}).sort((a,b)=>a.email.localeCompare(b.email));
 return Response.json({customers},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
 const context=await requireAdmin(request);
 if(!context)return Response.json({error:"Administrator access is required."},{status:403});
 const body=await request.json().catch(()=>({})),email=String(body.email||"").trim().toLowerCase(),access=String(body.access||"automatic");
 if(!email||!allowed.has(access))return Response.json({error:"Enter a customer email and choose a valid access setting."},{status:400});
 let page=1,target:any=null;
 while(page<=20&&!target){
  const result=await context.admin.auth.admin.listUsers({page,perPage:100});
  if(result.error)return Response.json({error:result.error.message},{status:500});
  target=result.data.users.find(user=>user.email?.toLowerCase()===email)||null;
  if(result.data.users.length<100)break;
  page++;
 }
 if(!target)return Response.json({error:"No Memento House account was found for that email."},{status:404});
 const metadata={...(target.user_metadata||{})};
 if(access==="automatic")delete metadata.map_access_override;
 else metadata.map_access_override=access;
 if(["map","plus","timeline-plus"].includes(access))metadata.product_tier=access;
 const update=await context.admin.auth.admin.updateUserById(target.id,{user_metadata:metadata});
 if(update.error)return Response.json({error:update.error.message},{status:500});
 return Response.json({ok:true,email,access});
}
