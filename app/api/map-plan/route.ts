import {createClient} from "@supabase/supabase-js";
import {resolveMapAccess,resolveMapTier} from "../../../lib/map-entitlement";

export async function GET(request:Request){
 const slug=new URL(request.url).searchParams.get("slug")||"";
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kdcymeoldvwlmfwemfgq.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key||!slug)return Response.json({tier:"map"});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data:wedding}=await admin.from("weddings").select("id,owner_user_id").eq("slug",slug).eq("status","active").maybeSingle();
 if(!wedding)return Response.json({tier:"map"});
 const[{data:user},{data:venue}]=await Promise.all([admin.auth.admin.getUserById(wedding.owner_user_id),admin.from("story_locations").select("location_name,latitude,longitude").eq("wedding_id",wedding.id).eq("story_type","Wedding Venue").maybeSingle()]);
 const[tier,access]=await Promise.all([resolveMapTier(admin,wedding.owner_user_id,user.user?.user_metadata,user.user?.email),resolveMapAccess(admin,wedding.owner_user_id,user.user?.user_metadata,user.user?.email)]);
 return Response.json({access,tier,venue:venue||null},{headers:{"Cache-Control":"no-store"}});
}
