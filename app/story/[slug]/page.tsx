import {createClient} from "@supabase/supabase-js";
import Link from "next/link";

export default async function StoryPage({params}:{params:Promise<{slug:string}>}){
 const{slug}=await params,url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return <main className="storyShare"><h1>Story unavailable</h1></main>;
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),w=await client.from("weddings").select("id,partner_one_name,partner_two_name,wedding_date").eq("slug",slug).eq("status","active").maybeSingle();
 if(!w.data)return <main className="storyShare"><h1>Story not found</h1><Link href="/">Return home</Link></main>;
 const rows=await client.from("timeline_entries").select("id,date_value,approximate_date_label,sort_date,title,category,story,contributor_name,destination:destinations(location_name)").eq("wedding_id",w.data.id).eq("status","published").eq("visibility","public").order("sort_date"),privateCategories=new Set(["Places We Have Lived","Home","Our Home"]);
 return <main className="storyShare"><header><small>MEMENTO MAP · TIMELINE PLUS</small><h1>{w.data.partner_one_name} <i>&</i> {w.data.partner_two_name}</h1><p>A story told through the places and moments that shaped it.</p></header><ol>{(rows.data||[]).map((entry:any)=><li key={entry.id}><time>{entry.approximate_date_label||entry.date_value||entry.sort_date}</time><article><small>{entry.category}</small><h2>{entry.title}</h2><p>{entry.story}</p><footer>{privateCategories.has(entry.category)?"Location kept private":entry.destination?.location_name}{entry.contributor_name?` · ${entry.contributor_name}`:""}</footer></article></li>)}</ol>{!rows.data?.length&&<p className="emptyStory">This couple has not published any memories yet.</p>}<footer><Link href="/">Memento House</Link></footer></main>;
}
