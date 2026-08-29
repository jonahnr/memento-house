import {requireAdmin} from "../../../../lib/admin";

const allowed=new Set(["automatic","off","map","plus","timeline-plus"]);

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
