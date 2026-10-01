import {requireUser} from "../../../../lib/request-user";
import {resolveMapTier} from "../../../../lib/map-entitlement";
import {typographyThemes} from "../../../../lib/map-presentation";

export async function PATCH(request:Request){
 const identity=await requireUser(request);if(!identity)return Response.json({error:"Please sign in again."},{status:401});
 const body=await request.json().catch(()=>null);if(!body||typeof body.mapId!=="string")return Response.json({error:"Choose a map."},{status:400});
 const current=await identity.admin.from("weddings").select("id,event_metadata").eq("id",body.mapId).eq("owner_user_id",identity.user.id).maybeSingle();
 if(current.error||!current.data)return Response.json({error:"Map not found."},{status:404});
 const patch:Record<string,unknown>={};
 if("typography_theme" in body){if(!typographyThemes.some(theme=>theme.id===body.typography_theme))return Response.json({error:"Choose one of the five typography themes."},{status:400});patch.typography_theme=body.typography_theme}
 if("include_guest_memories" in body){
  if(typeof body.include_guest_memories!=="boolean")return Response.json({error:"Choose whether to include guest memories."},{status:400});
  const tier=await resolveMapTier(identity.admin,identity.user.id,identity.user.user_metadata,identity.user.email,current.data.id);
  if(tier!=="timeline-plus")return Response.json({error:"Guest memories require Timeline Plus."},{status:403});
  patch.include_guest_memories=body.include_guest_memories;
 }
 if("participation_guide_reviewed" in body){if(body.participation_guide_reviewed!==true)return Response.json({error:"Invalid guide review."},{status:400});patch.participation_guide_reviewed=true}
 if("excluded_story_memory_ids" in body){if(!Array.isArray(body.excluded_story_memory_ids)||body.excluded_story_memory_ids.some((id:unknown)=>typeof id!=="string"))return Response.json({error:"Invalid memory selection."},{status:400});const entries=await identity.admin.from("timeline_entries").select("id").eq("wedding_id",current.data.id);if(entries.error||body.excluded_story_memory_ids.some((id:string)=>!entries.data?.some(entry=>entry.id===id)))return Response.json({error:"Memory not found."},{status:400});patch.excluded_story_memory_ids=body.excluded_story_memory_ids}
 if(!Object.keys(patch).length)return Response.json({error:"No settings supplied."},{status:400});
 const result=await identity.admin.from("weddings").update({event_metadata:{...current.data.event_metadata,...patch},updated_at:new Date().toISOString()}).eq("id",current.data.id).eq("owner_user_id",identity.user.id).select().single();
 return result.error?Response.json({error:"Settings could not be saved."},{status:500}):Response.json({map:result.data});
}
