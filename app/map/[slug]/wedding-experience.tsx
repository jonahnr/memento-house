"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {AdventureMap,type GeoPin} from "./adventure-map";
import {LocationSearch} from "./location-search";
import {getSupabaseBrowserClient} from "../../../lib/supabase";

type Rec=GeoPin&{destinationId:string};
type Wedding={id:string;partner_one_name:string;partner_two_name:string;wedding_date:string|null;title:string;slug:string;welcome_message:string};
const blank=()=>({place:"",message:"",guest:"",category:"Adventure",lat:NaN,lng:NaN});
const normalize=(s:string)=>s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
const dateLabel=(value:string|null)=>value?new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(value+"T00:00:00Z")):"";

export function WeddingExperience({slug}:{slug:string}){
 const[wedding,setWedding]=useState<Wedding|null>(null),[recs,setRecs]=useState<Rec[]>([]),[open,setOpen]=useState(false),[selected,setSelected]=useState<Rec|null>(null);
 const[tab,setTab]=useState("recommendations"),[sort,setSort]=useState("loved"),[success,setSuccess]=useState(false),[form,setForm]=useState(blank()),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{
  const client=getSupabaseBrowserClient();if(!client){setError("The map service is unavailable.");setLoading(false);return}
  const{data:w,error:wError}=await client.from("weddings").select("id,partner_one_name,partner_two_name,wedding_date,title,slug,welcome_message").eq("slug",slug).eq("status","active").single();
  if(wError||!w){setError("This wedding map could not be found.");setLoading(false);return}
  setWedding(w as Wedding);
  const[{data:r,error:rError},{data:likes}]=await Promise.all([
   client.from("recommendations").select("id,guest_name,message,category,status,destination_id,destination:destinations(location_name,latitude,longitude)").eq("wedding_id",w.id).eq("status","active").order("created_at",{ascending:false}),
   client.from("destination_likes").select("destination_id")
  ]);
  if(rError){setError(rError.message);setLoading(false);return}
  const counts=new Map<string,number>();(likes||[]).forEach((l:any)=>counts.set(l.destination_id,(counts.get(l.destination_id)||0)+1));
  const pins=(r||[]).map((row:any)=>{const d=Array.isArray(row.destination)?row.destination[0]:row.destination;return{id:row.id,destinationId:row.destination_id,place:d.location_name,guest:row.guest_name,message:row.message,category:row.category||"Adventure",likes:counts.get(row.destination_id)||0,lng:d.longitude,lat:d.latitude}}) as Rec[];
  setRecs(pins);setSelected(pins[0]||null);setLoading(false);
 },[slug]);
 useEffect(()=>{load()},[load]);
 const sorted=useMemo(()=>[...recs].sort((a,b)=>sort==="loved"?b.likes-a.likes:String(b.id).localeCompare(String(a.id))),[recs,sort]);
 async function like(pin:Rec){
  const client=getSupabaseBrowserClient();if(!client)return;
  let anon=localStorage.getItem("memento-anonymous-id");if(!anon){anon=crypto.randomUUID();localStorage.setItem("memento-anonymous-id",anon)}
  const{error}=await client.from("destination_likes").insert({destination_id:pin.destinationId,anonymous_session_id:anon});
  if(!error){setRecs(v=>v.map(r=>r.id===pin.id?{...r,likes:r.likes+1}:r));setSelected(s=>s?.id===pin.id?{...s,likes:s.likes+1}:s)}
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!wedding||!Number.isFinite(form.lat)||!Number.isFinite(form.lng))return;setError("");
  const client=getSupabaseBrowserClient()!,normalized=normalize(form.place);
  let{data:destination}=await client.from("destinations").select("id").eq("wedding_id",wedding.id).eq("normalized_location_name",normalized).maybeSingle();
  if(!destination){const created=await client.from("destinations").insert({wedding_id:wedding.id,location_name:form.place,normalized_location_name:normalized,latitude:form.lat,longitude:form.lng}).select("id").single();if(created.error){setError(created.error.message);return}destination=created.data}
  const created=await client.from("recommendations").insert({wedding_id:wedding.id,destination_id:destination.id,guest_name:form.guest,message:form.message,category:form.category,status:"active"}).select("id").single();
  if(created.error){setError(created.error.message);return}
  const next:Rec={id:created.data.id,destinationId:destination.id,...form,likes:0};setRecs(v=>[next,...v]);setSelected(next);setSuccess(true)
 }
 function close(){setOpen(false);setSuccess(false);setForm(blank())}
 if(loading)return <main className="auth authLoading"><div><span className="eyebrow">Memento House</span><h1>Opening the adventure map…</h1></div></main>;
 if(!wedding)return <main className="auth authLoading"><div><span className="eyebrow">Memento House</span><h1>Map not found</h1><p>{error}</p><LinkHome/></div></main>;
 const names=`${wedding.partner_one_name} & ${wedding.partner_two_name}`;
 return <main className="weddingPage">
  <header className="weddingHeader"><a href="/" className="brand"><img src="/brand/memento-house-logo.webp" alt="Memento House"/><span>Memento <i>Map</i></span></a><span className="date">{dateLabel(wedding.wedding_date).toUpperCase()}</span><a href="#adventures" className="headerLink">Browse adventures ↓</a></header>
  <section className="coupleIntro"><span className="script">{wedding.title}</span><h1>{wedding.partner_one_name} <i>&</i> {wedding.partner_two_name}</h1><p>{wedding.welcome_message}</p><button className="button gold" onClick={()=>setOpen(true)}>＋ Add an Adventure</button></section>
  <section className="mapShell"><div className="mapTabs"><button className={tab==="recommendations"?"active":""} onClick={()=>setTab("recommendations")}>✦ Guest Recommendations <b>{recs.length}</b></button><button className={tab==="visited"?"active":""} onClick={()=>setTab("visited")}>✓ Places We’ve Visited <b>0</b></button></div><div className="adventureMap"><AdventureMap recommendations={recs} stories={[]} tab={tab} selected={selected} onSelect={p=>setSelected(p as Rec|null)}/><div className="mapKey"><span><i className="goldDot"/>Recommendation</span></div>{selected&&<aside className="pinCard"><button className="closeCard" onClick={()=>setSelected(null)}>×</button><div className="tag">{selected.category}</div><h3>{selected.place}</h3><small>Recommended by {selected.guest}</small><p>“{selected.message}”</p><button className="heart" onClick={()=>like(selected)}>♡ <b>{selected.likes}</b> guests love this</button><small className="pinCoordinates">{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</small></aside>}</div></section>
  <section className="adventures" id="adventures"><div className="sectionHead"><div><div className="eyebrow">From the people we love</div><h2>Where should we go next?</h2></div><label>Sort by <select value={sort} onChange={e=>setSort(e.target.value)}><option value="loved">Most loved</option><option value="new">Newest</option></select></label></div><div className="recGrid">{sorted.map(r=><article className="recCard" key={r.id} onClick={()=>{setSelected(r);scrollTo({top:360,behavior:"smooth"})}}><div className="recTop"><span className="tag">{r.category}</span><button onClick={e=>{e.stopPropagation();like(r)}} aria-label={`Like ${r.place}`}>♡ {r.likes}</button></div><h3>{r.place}</h3><small>Recommended by <b>{r.guest}</b></small><p>“{r.message}”</p><span className="view">View on map ↗</span></article>)}</div></section>
  <section className="guestNote"><span>✦</span><div><h2>Have somewhere special in mind?</h2><p>Your recommendation becomes part of {names}’s story and is pinned at its real coordinates.</p></div><button className="button gold" onClick={()=>setOpen(true)}>Add your adventure →</button></section>
  <footer><p>Made with love for {names}</p><a href="/" className="brand"><img src="/brand/memento-house-logo.webp" alt="Memento House"/><span>Memento <i>Map</i></span></a><p>Made for the moment. Kept for a lifetime.</p></footer>
  {open&&<div className="modalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="modal" role="dialog" aria-modal="true"><button className="modalClose" onClick={close}>×</button>{success?<div className="success"><span>✦</span><div className="eyebrow">Added with love</div><h2>You’re officially part of their adventure.</h2><p>Your recommendation is now saved and pinned at its real-world location.</p><button className="button gold" onClick={close}>View on Map</button></div>:<form onSubmit={submit}><div className="eyebrow">Send them somewhere wonderful</div><h2>Add an Adventure</h2><p className="formIntro">Search and select a real address, venue, city, or landmark.</p><label><b>Where should we go?</b><LocationSearch value={form.place} onSelect={p=>setForm({...form,place:p.name,lat:p.lat,lng:p.lng})}/></label><label><b>Why should we go here?</b><textarea required minLength={5} placeholder="Tell us what makes this place special…" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label><div className="twoCols"><label><b>Who’s sending us there?</b><input required placeholder="Tyler & Megan" value={form.guest} onChange={e=>setForm({...form,guest:e.target.value})}/></label><label><b>Perfect for</b><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["Romantic","Adventure","Food","Relaxing","Outdoors","City Trip","Beach","Weekend Trip","Bucket List"].map(c=><option key={c}>{c}</option>)}</select></label></div>{error&&<p className="authError">{error}</p>}<button disabled={!Number.isFinite(form.lat)} className="button gold submit">Add to Their Map →</button><small className="privacy">No account needed. Your name is only shown with this recommendation.</small></form>}</section></div>}
 </main>
}
function LinkHome(){return <a className="button gold" href="/">Return home</a>}
