import {createClient} from "@supabase/supabase-js";
import {readConfirmationWatch} from "../../../../lib/confirmation-watch";
import {supabaseServerConfig} from "../../../../lib/server-config";

export async function POST(request:Request){
 const body=await request.json().catch(()=>({})),token=String(body.token||""),{url,serviceRoleKey}=supabaseServerConfig();
 if(!serviceRoleKey)return Response.json({confirmed:false},{status:503});
 const watch=readConfirmationWatch(token,serviceRoleKey);if(!watch)return Response.json({confirmed:false},{status:400});
 const admin=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}}),result=await admin.auth.admin.getUserById(watch.userId),user=result.data.user,metadata=user?.user_metadata||{};
 if(result.error||!user)return Response.json({confirmed:false});
 return Response.json({confirmed:Boolean((user.email_confirmed_at||user.confirmed_at)&&(!metadata.memento_email_confirmation_required||metadata.memento_email_confirmed_at))});
}
