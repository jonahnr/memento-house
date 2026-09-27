import {getSupabaseBrowserClient} from "./supabase";
import type {EventMetadata} from "./map-presentation";
export async function saveMapPresentation(mapId:string,patch:Pick<EventMetadata,"typography_theme"|"include_guest_memories">){
 const session=(await getSupabaseBrowserClient()?.auth.getSession())?.data.session;
 if(!session)throw new Error("Please sign in again before saving.");
 const response=await fetch("/api/maps/settings",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({mapId,...patch})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||"Settings could not be saved.");return result.map;
}
