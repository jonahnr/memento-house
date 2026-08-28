import {createClient,type SupabaseClient,type User} from "@supabase/supabase-js";
import {supabaseServerConfig} from "./server-config";

export const PAYMENT_TESTER_EMAILS=(process.env.PAYMENT_TESTER_EMAILS||"jonahnr@gmail.com,robinsonrealestate.cincy@gmail.com").toLowerCase().split(",").map(value=>value.trim()).filter(Boolean);

export async function requirePaymentTester(request:Request):Promise<{admin:SupabaseClient;user:User}|null>{
 const{url,serviceRoleKey}=supabaseServerConfig(),token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!serviceRoleKey||!token)return null;
 const admin=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}}),auth=await admin.auth.getUser(token),user=auth.data.user;
 if(!user||!PAYMENT_TESTER_EMAILS.includes(user.email?.toLowerCase()||""))return null;
 return{admin,user};
}

export async function paymentTesterFailure(request:Request){
 const{url,serviceRoleKey}=supabaseServerConfig(),token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!serviceRoleKey)return Response.json({error:"SUPABASE_SERVICE_ROLE_KEY is not available to this deployment."},{status:503});
 if(!token)return Response.json({error:"Sign in before starting a private payment test."},{status:401});
 const admin=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}}),auth=await admin.auth.getUser(token);
 if(auth.error||!auth.data.user)return Response.json({error:`Supabase rejected this login session: ${auth.error?.message||"user not found"}`},{status:401});
 return Response.json({error:"This customer account is not authorized to use private payment testing."},{status:403});
}
