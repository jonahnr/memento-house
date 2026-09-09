import {createClient} from "@supabase/supabase-js";
import Link from "next/link";
import {withWeddingStory} from "../../../lib/wedding-story";
import type {MediaAsset} from "../../../lib/media";
import {MediaPlayer} from "../../media-components";

export default async function StoryPage({params}:{params:Promise<{slug:string}>}){
 const{slug}=await params,url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return <main className="storyShare"><h1>Story unavailable</h1></main>;
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),w=await client.from("weddings").select("id,partner_one_name,partner_two_name,wedding_date").eq("slug",slug).eq("status","active").maybeSingle();
 if(!w.data)return <main className="storyShare"><h1>Story not found</h1><Link href="/">Return home</Link></main>;
 const[rows,venue,media]=await Promise.all([
  client.from("timeline_entries").select("id,date_value,approximate_date_label,sort_date,title,category,story,contributor_name,destination:destinations(location_name)").eq("wedding_id",w.data.id).eq("status","published").eq("visibility","public").order("sort_date"),
  client.from("story_locations").select("id,title,description,story_type,event_date,image_url,location_name,latitude,longitude,sort_order").eq("wedding_id",w.data.id).eq("story_type","Wedding Venue"),
  client.from("media_assets").select("id,media_type,status,public_url,playback_url,thumbnail_url,cloudflare_uid,alt_text,duration_seconds,timeline_entry_id,story_location_id,error_message").eq("wedding_id",w.data.id).eq("status","ready").is("deleted_at",null)
 ]);
 const assets=(media.data||[]) as MediaAsset[],privateCategories=new Set(["Places We Have Lived","Home","Our Home"]),timelineChapters=(rows.data||[]).map(entry=>({...entry,image_url:null,media:assets.filter(asset=>asset.timeline_entry_id===entry.id)}));
 const weddingChapters=withWeddingStory(w.data,venue.data||[]).map(chapter=>({id:`story-${chapter.id}`,date_value:chapter.event_date,sort_date:chapter.event_date||"9999-12-31",approximate_date_label:null,title:chapter.title,category:"Wedding",story:chapter.description,contributor_name:"",image_url:chapter.image_url,destination:{location_name:chapter.location_name},media:assets.filter(asset=>asset.story_location_id===chapter.id)})),chapters=[...timelineChapters,...weddingChapters].sort((a,b)=>a.sort_date.localeCompare(b.sort_date));
 return <main className="storyShare"><header><small>MEMENTO MAP · TIMELINE PLUS</small><h1>{w.data.partner_one_name} <i>&</i> {w.data.partner_two_name}</h1><p>A story told through the places and moments that shaped it.</p></header><ol>{chapters.map((entry:any)=>{const attached=(entry.media||[]).filter((asset:MediaAsset)=>asset.media_type==="video"||asset.public_url!==entry.image_url);return <li key={entry.id}><time>{entry.approximate_date_label||entry.date_value||entry.sort_date}</time><article>{entry.image_url&&<img src={entry.image_url} alt={entry.title}/>} {attached.map((asset:MediaAsset)=><MediaPlayer key={asset.id} asset={asset} title={entry.title}/>) }<small>{entry.category}</small><h2>{entry.title}</h2><p>{entry.story}</p><footer>{privateCategories.has(entry.category)?"Location kept private":entry.destination?.location_name}{entry.contributor_name?` · ${entry.contributor_name}`:""}</footer></article></li>})}</ol>{!chapters.length&&<p className="emptyStory">This couple has not published any memories yet.</p>}<footer><Link href="/">Memento House</Link></footer></main>;
}
