import {createClient} from "@supabase/supabase-js";
import {supabaseServerConfig} from "../../../../lib/server-config";

export async function POST(request:Request){
 const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return Response.json({error:"A valid confirmation session is required."},{status:401});
 const{url,serviceRoleKey}=supabaseServerConfig();
 if(!serviceRoleKey)return Response.json({error:"Account confirmation is temporarily unavailable."},{status:503});
 const admin=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}}),verified=await admin.auth.getUser(token),user=verified.data.user;
 if(verified.error||!user)return Response.json({error:"This confirmation link is no longer valid."},{status:401});
 const metadata={...(user.user_metadata||{}),memento_email_confirmation_required:false,memento_email_confirmed_at:new Date().toISOString()};
 const updated=await admin.auth.admin.updateUserById(user.id,{user_metadata:metadata});
 if(updated.error){console.error(JSON.stringify({level:"error",message:"account_confirmation_marker_failed",userId:user.id,code:updated.error.code||null}));return Response.json({error:"Your email was verified, but your account could not be activated."},{status:500})}
 return Response.json({ok:true});
}
