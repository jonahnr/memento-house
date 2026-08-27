import type {SupabaseClient} from "@supabase/supabase-js";

export type MapTier="map"|"plus"|"timeline-plus";

export async function resolveMapTier(admin:SupabaseClient,userId:string,metadata?:Record<string,unknown>):Promise<MapTier>{
 const result=await admin.from("entitlements").select("entitlement,status").eq("customer_user_id",userId).eq("status","active");
 const values=new Set((result.data||[]).map(row=>String(row.entitlement)));
 if(values.has("map_timeline_plus"))return "timeline-plus";
 if(values.has("map_plus"))return "plus";
 if(values.has("map_basic"))return "map";
 const tier=String(metadata?.product_tier||"");
 return tier==="timeline-plus"?"timeline-plus":tier==="plus"?"plus":"map";
}

export function tierIncludesPlus(tier:MapTier){return tier==="plus"||tier==="timeline-plus"}
