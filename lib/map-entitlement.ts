import type {SupabaseClient} from "@supabase/supabase-js";

export type MapTier="map"|"plus"|"timeline-plus";

export type MapAccessOverride="automatic"|"off"|MapTier;

export function resolveMapAccessOverride(metadata?:Record<string,unknown>):MapAccessOverride{
 const value=String(metadata?.map_access_override||"");
 return ["off","map","plus","timeline-plus"].includes(value)?value as MapAccessOverride:"automatic";
}

export function mapAccessEnabled(metadata?:Record<string,unknown>){return resolveMapAccessOverride(metadata)!=="off"}

export async function resolveMapTier(admin:SupabaseClient,userId:string,metadata?:Record<string,unknown>,email?:string|null):Promise<MapTier>{
 const override=resolveMapAccessOverride(metadata);
 if(override!=="automatic"&&override!=="off")return override;
 const preview=String(metadata?.product_tier||"");
 if(email?.toLowerCase()==="jonahnr@gmail.com"&&["map","plus","timeline-plus"].includes(preview))return preview as MapTier;
 const result=await admin.from("entitlements").select("entitlement,status").eq("user_id",userId).eq("status","active");
 const values=new Set((result.data||[]).map(row=>String(row.entitlement)));
 if(values.has("map_timeline_plus"))return "timeline-plus";
 if(values.has("map_plus"))return "plus";
 if(values.has("map_basic"))return "map";
 const tier=preview;
 return tier==="timeline-plus"?"timeline-plus":tier==="plus"?"plus":"map";
}

export function tierIncludesPlus(tier:MapTier){return tier==="plus"||tier==="timeline-plus"}
