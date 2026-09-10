import type {SupabaseClient} from "@supabase/supabase-js";

export type MapTier="map"|"plus"|"timeline-plus";

export type MapAccessOverride="automatic"|"off"|MapTier;

export function resolveMapAccessOverride(metadata?:Record<string,unknown>):MapAccessOverride{
 const value=String(metadata?.map_access_override||"");
 return ["off","map","plus","timeline-plus"].includes(value)?value as MapAccessOverride:"automatic";
}

export async function resolveMapAccess(admin:SupabaseClient,userId:string,metadata?:Record<string,unknown>,email?:string|null,mapId?:string){
 const override=resolveMapAccessOverride(metadata);
 if(override==="off")return false;
 if(override!=="automatic")return true;
 if(email?.toLowerCase()==="jonahnr@gmail.com")return true;
 let query=admin.from("entitlements").select("id").eq("user_id",userId).eq("status","active").in("entitlement",["map_basic","map_plus","map_timeline_plus"]);if(mapId)query=query.eq("map_id",mapId);const result=await query.limit(1);
 return Boolean(result.data?.length);
}

export async function resolveMapTier(admin:SupabaseClient,userId:string,metadata?:Record<string,unknown>,email?:string|null,mapId?:string):Promise<MapTier>{
 const override=resolveMapAccessOverride(metadata);
 if(override!=="automatic"&&override!=="off")return override;
 if(mapId){const map=await admin.from("weddings").select("map_tier").eq("id",mapId).eq("owner_user_id",userId).maybeSingle();if(["map","plus","timeline-plus"].includes(String(map.data?.map_tier)))return map.data!.map_tier as MapTier}
 const preview=String(metadata?.product_tier||"");
 if(email?.toLowerCase()==="jonahnr@gmail.com"&&["map","plus","timeline-plus"].includes(preview))return preview as MapTier;
 let query=admin.from("entitlements").select("entitlement,status").eq("user_id",userId).eq("status","active");if(mapId)query=query.eq("map_id",mapId);const result=await query;
 const values=new Set((result.data||[]).map(row=>String(row.entitlement)));
 if(values.has("map_timeline_plus"))return "timeline-plus";
 if(values.has("map_plus"))return "plus";
 if(values.has("map_basic"))return "map";
 const tier=preview;
 return tier==="timeline-plus"?"timeline-plus":tier==="plus"?"plus":"map";
}

export function tierIncludesPlus(tier:MapTier){return tier==="plus"||tier==="timeline-plus"}
