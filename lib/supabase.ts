import {createClient,type SupabaseClient} from "@supabase/supabase-js";

// This application intentionally uses Supabase without generated database
// types. Keep the schema generic explicit so native Next.js type checking does
// not infer every untyped mutation payload as `never`.
let browserClient: SupabaseClient<any,"public",any> | null = null;

export function getSupabaseBrowserClient(){
  // These are public browser credentials, not privileged secrets. The fallback
  // keeps authentication available when a remote build cannot inline runtime env.
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kdcymeoldvwlmfwemfgq.supabase.co";
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_8lGHImYLdfKdAGEXYStzfA_kge3WeK4";
  if(!url||!key)return null;
  if(!browserClient)browserClient=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return browserClient;
}
