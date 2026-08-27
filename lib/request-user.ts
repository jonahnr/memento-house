import {createClient,type SupabaseClient,type User} from "@supabase/supabase-js";
import {supabaseServerConfig} from "./server-config";
export async function requireUser(request:Request):Promise<{admin:SupabaseClient;user:User}|null>{const{url,serviceRoleKey:key}=supabaseServerConfig(),token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");if(!key||!token)return null;const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),auth=await admin.auth.getUser(token);return auth.data.user?{admin,user:auth.data.user}:null}
