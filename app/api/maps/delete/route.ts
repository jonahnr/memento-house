import {requireUser} from "../../../../lib/request-user";
import {deleteStreamVideo} from "../../../../lib/cloudflare-stream";
export async function DELETE(request:Request){
 const identity=await requireUser(request);if(!identity)return Response.json({error:"Please sign in again."},{status:401});
 const body=await request.json().catch(()=>null);if(!body||typeof body.mapId!=="string"||body.confirmation!=="DELETE")return Response.json({error:"Type DELETE to confirm."},{status:400});
 const {admin,user}=identity,map=await admin.from("weddings").select("id,hero_image_url").eq("id",body.mapId).eq("owner_user_id",user.id).maybeSingle();if(map.error||!map.data)return Response.json({error:"Experience not found."},{status:404});
 // Clean provider assets before cascading relational deletion. Failures leave the map available for retry.
 const [assets,entries,stories,travel]=await Promise.all([admin.from("media_assets").select("storage_path,cloudflare_uid").eq("wedding_id",map.data.id),admin.from("timeline_entries").select("id").eq("wedding_id",map.data.id),admin.from("story_locations").select("image_url").eq("wedding_id",map.data.id),admin.from("couple_destination_status").select("image_url").eq("wedding_id",map.data.id)]);
 if([assets,entries,stories,travel].some(result=>result.error))return Response.json({error:"Experience records could not be checked. Nothing was deleted."},{status:500});
 const photos=entries.data?.length?await admin.from("timeline_photos").select("storage_path").in("entry_id",entries.data.map(entry=>entry.id)):{data:[],error:null};if(photos.error)return Response.json({error:"Photos could not be checked."},{status:500});
 const paths=new Set<string>([...(assets.data||[]),...(photos.data||[])].flatMap(asset=>asset.storage_path?[asset.storage_path]:[]));
 // Legacy uploads use the owner's folder; only remove paths referenced by this map.
 for(const row of [{image_url:map.data.hero_image_url},...(stories.data||[]),...(travel.data||[])]){if(row.image_url){try{const path=new URL(row.image_url).pathname.split("/storage/v1/object/public/memento-photos/")[1];if(path)paths.add(decodeURIComponent(path))}catch{ /* External images are not owned storage objects. */ }}}
 // Preserve any photo reused by another experience, including legacy owner uploads.
 const otherMaps=await admin.from("weddings").select("id,hero_image_url").eq("owner_user_id",user.id).neq("id",map.data.id);
 if(otherMaps.error)return Response.json({error:"Related experiences could not be checked."},{status:500});
 for(const row of otherMaps.data||[]){if(row.hero_image_url){try{const path=new URL(row.hero_image_url).pathname.split("/storage/v1/object/public/memento-photos/")[1];if(path)paths.delete(decodeURIComponent(path))}catch{}}}
 if(otherMaps.data?.length){const ids=otherMaps.data.map(row=>row.id),references=await Promise.all([admin.from("media_assets").select("storage_path").in("wedding_id",ids),admin.from("story_locations").select("image_url").in("wedding_id",ids),admin.from("couple_destination_status").select("image_url").in("wedding_id",ids)]);if(references.some(result=>result.error))return Response.json({error:"Shared media could not be checked."},{status:500});for(const row of references[0].data||[])if(row.storage_path)paths.delete(row.storage_path);for(const row of [...(references[1].data||[]),...(references[2].data||[])]){const image=(row as {image_url?:string}).image_url;if(image){try{const path=new URL(image).pathname.split("/storage/v1/object/public/memento-photos/")[1];if(path)paths.delete(decodeURIComponent(path))}catch{}}}}
 try{for(const asset of assets.data||[])if(asset.cloudflare_uid)await deleteStreamVideo(asset.cloudflare_uid);if(paths.size){const removed=await admin.storage.from("memento-photos").remove([...paths]);if(removed.error)throw removed.error}}catch{return Response.json({error:"Media cleanup could not finish. Please retry deletion."},{status:502})}
 const removed=await admin.from("weddings").delete().eq("id",map.data.id).eq("owner_user_id",user.id).select("id").single();return removed.error?Response.json({error:"Experience could not be deleted. Please retry."},{status:500}):Response.json({ok:true});
}
