"use client";

import Link from "next/link";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {getSupabaseBrowserClient} from "../../lib/supabase";

type Wedding={id:string;partner_one_name:string;partner_two_name:string;wedding_date:string|null;title:string;slug:string;welcome_message:string;accent_color:string};
type Recommendation={id:string;guest_name:string;category:string|null;status:"active"|"hidden"|"deleted";destination:{location_name:string}|null};
const items=["Overview","Our Story","Recommendations","Wedding Map","QR Code","Keepsake","Settings"];

const prettyDate=(value:string|null,short=false)=>{
 if(!value)return "Wedding date to come";
 return new Intl.DateTimeFormat("en-US",{month:short?"short":"long",day:"numeric",year:"numeric",weekday:short?undefined:"long",timeZone:"UTC"}).format(new Date(value+"T00:00:00Z"));
};

export function Dashboard(){
 const[section,setSection]=useState("Overview"),[wedding,setWedding]=useState<Wedding|null>(null),[data,setData]=useState<Recommendation[]>([]);
 const[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{
  const client=getSupabaseBrowserClient(); if(!client){setError("Account service is not available.");setLoading(false);return}
  const{data:session}=await client.auth.getSession(); const user=session.session?.user;
  if(!user){setLoading(false);return}
  const{data:w,error:wError}=await client.from("weddings").select("id,partner_one_name,partner_two_name,wedding_date,title,slug,welcome_message,accent_color").eq("owner_user_id",user.id).single();
  if(wError||!w){setError(wError?.message||"Your wedding workspace could not be found.");setLoading(false);return}
  setWedding(w as Wedding);
  const{data:r,error:rError}=await client.from("recommendations").select("id,guest_name,category,status,destination:destinations(location_name)").eq("wedding_id",w.id).neq("status","deleted").order("created_at",{ascending:false});
  if(rError)setError(rError.message); else setData((r||[]) as unknown as Recommendation[]);
  setLoading(false);
 },[]);
 useEffect(()=>{load()},[load]);
 async function setStatus(id:string,status:"active"|"hidden"){
  const client=getSupabaseBrowserClient();const previous=data;setData(v=>v.map(r=>r.id===id?{...r,status}:r));
  const{error}=await client!.from("recommendations").update({status}).eq("id",id);if(error){setData(previous);setError(error.message)}
 }
 async function remove(id:string){
  const client=getSupabaseBrowserClient();const previous=data;setData(v=>v.filter(r=>r.id!==id));
  const{error}=await client!.from("recommendations").update({status:"deleted"}).eq("id",id);if(error){setData(previous);setError(error.message)}
 }
 if(loading)return <main className="auth authLoading"><div><span className="eyebrow">Memento House</span><h1>Preparing your wedding workspace…</h1></div></main>;
 if(!wedding)return <main className="auth authLoading"><div><span className="eyebrow">Memento House</span><h1>We couldn’t open your wedding.</h1><p>{error||"Please sign out and sign in again."}</p><button className="button gold" onClick={load}>Try again</button></div></main>;
 const names=`${wedding.partner_one_name} & ${wedding.partner_two_name}`, initials=`${wedding.partner_one_name[0]||""}${wedding.partner_two_name[0]||""}`.toUpperCase();
 const mapPath=`/map/${wedding.slug}`, mapUrl=`https://mementohouse.com${mapPath}`;
 return <main className="dash">
  <aside><Link href="/" className="brand"><span className="brandMark">M</span><span>Memento <i>Map</i><small>by Memento House</small></span></Link>
   <div className="coupleChip"><span>{initials[0]}<span>&</span>{initials[1]}</span><div><b>{names}</b><small>{prettyDate(wedding.wedding_date,true)}</small></div></div>
   <nav>{items.map((x,i)=><button key={x} onClick={()=>setSection(x)} className={section===x?"active":""}><i>{["⌂","♥","✦","⌖","▦","◇","⚙"][i]}</i>{x}</button>)}</nav>
   <Link className="publicLink" href={mapPath}>↗ View guest map</Link>
  </aside>
  <section className="dashMain"><header><div><small>{names.toUpperCase()}’S WEDDING</small><h1>{section}</h1></div><div className="dashActions"><span>{initials}</span></div></header>
   {error&&<div className="authError">{error}</div>}
   {section==="Overview"&&<Overview wedding={wedding} recommendations={data} mapPath={mapPath} onSection={setSection}/>}
   {section==="Recommendations"&&<Recommendations rows={data} onStatus={setStatus} onRemove={remove}/>}
   {section==="Our Story"&&<Empty title="The places that made you, you." text="Add milestones from your relationship so guests can see the story behind the map." action="Story editor coming next"/>}
   {section==="Wedding Map"&&<div className="panel"><div className="panelHead"><div><small>LIVE GUEST EXPERIENCE</small><h3>{wedding.title}</h3></div><Link href={mapPath}>Open full map ↗</Link></div><p>Your public map uses the exact coordinates guests choose when they add a recommendation.</p><Link href={mapPath} className="button gold">Open live map</Link></div>}
   {section==="QR Code"&&<QR wedding={wedding} mapUrl={mapUrl}/>}
   {section==="Keepsake"&&<Keepsake wedding={wedding} recommendations={data}/>}
   {section==="Settings"&&<Settings wedding={wedding} onSaved={setWedding}/>}
  </section>
 </main>
}

function Overview({wedding,recommendations,mapPath,onSection}:{wedding:Wedding;recommendations:Recommendation[];mapPath:string;onSection:(s:string)=>void}){
 const unique=new Set(recommendations.map(r=>r.destination?.location_name).filter(Boolean)).size;
 return <><div className="welcome"><div><div className="eyebrow">{prettyDate(wedding.wedding_date)}</div><h2>Your adventure is taking shape.</h2><p>{wedding.welcome_message}</p></div><div><Link href={mapPath} className="button light">View guest map ↗</Link><button className="button gold" onClick={()=>onSection("QR Code")}>Open QR card</button></div></div>
 <div className="stats"><article><span>✦</span><b>{unique}</b><small>Places recommended</small></article><article><span>♡</span><b>{recommendations.length}</b><small>Guest contributions</small></article><article><span>⌁</span><b>{recommendations.filter(r=>r.status==="active").length}</b><small>Visible suggestions</small></article><article><span>↗</span><b>{recommendations[0]?.destination?.location_name||"Waiting"}</b><small>Latest place</small></article></div>
 <div className="panel"><div className="panelHead"><div><small>LIVE ACTIVITY</small><h3>Recent recommendations</h3></div><button onClick={()=>onSection("Recommendations")}>View all →</button></div>{recommendations.length?recommendations.slice(0,5).map(r=><div className="activity" key={r.id}><span>✦</span><div><b>{r.destination?.location_name||"Saved place"}</b><small>Recommended by {r.guest_name}</small></div><time>{r.status}</time></div>):<p>No guest recommendations yet. Share your guest map to begin.</p>}</div></>
}

function Recommendations({rows,onStatus,onRemove}:{rows:Recommendation[];onStatus:(id:string,s:"active"|"hidden")=>void;onRemove:(id:string)=>void}){
 return <div className="panel manage"><div className="panelHead"><div><small>MODERATION</small><h3>Guest recommendations</h3><p>Hide suggestions without losing them, or remove them from your collection.</p></div></div>{rows.length?rows.map(r=><div className="manageRow" key={r.id}><div><b>{r.destination?.location_name||"Saved place"}</b><small>{r.guest_name}{r.category?` · ${r.category}`:""}</small></div><select value={r.status} onChange={e=>onStatus(r.id,e.target.value as "active"|"hidden")}><option value="active">Active</option><option value="hidden">Hidden</option></select><button onClick={()=>onRemove(r.id)}>Remove</button></div>):<p>No recommendations have been submitted yet.</p>}</div>
}

function Empty({title,text,action}:{title:string;text:string;action:string}){return <div className="empty"><span>♡</span><h2>{title}</h2><p>{text}</p><button className="button gold" disabled>{action}</button></div>}
function QR({wedding,mapUrl}:{wedding:Wedding;mapUrl:string}){const names=`${wedding.partner_one_name} & ${wedding.partner_two_name}`;return <div className="qrLayout"><div className="qrCard"><div className="eyebrow">{names}</div><h2>Help Build Our<br/><i>Adventure Map</i></h2><p>Scan to add a place we should visit and tell us why.</p><div className="fakeQr" aria-label="QR preview">{Array.from({length:81},(_,i)=><i key={i} className={(i*7+i%5)%3?"on":""}/>)}</div><b>{mapUrl.replace("https://","")}</b><small>THANK YOU FOR BEING PART OF OUR STORY</small></div><div className="qrTools"><h2>Your Wedding Link</h2><p>Use this link on invitations and guest-table cards.</p><label>Guest map link<input value={mapUrl} readOnly/></label><button className="button light" onClick={()=>navigator.clipboard.writeText(mapUrl)}>Copy link</button><button className="button gold" onClick={()=>window.print()}>Print card ↓</button></div></div>}
function Keepsake({wedding,recommendations}:{wedding:Wedding;recommendations:Recommendation[]}){return <div className="keepsake"><div className="eyebrow">{wedding.title}</div><h2>{wedding.partner_one_name} <i>&</i> {wedding.partner_two_name}</h2><p>{prettyDate(wedding.wedding_date)}</p><div className="keepsakeMap">{recommendations.slice(0,4).map(r=><span key={r.id}>{r.destination?.location_name}</span>)}</div><div className="keepsakeStats">{recommendations.length} guest memories</div><blockquote>“May every place carry a memory of the people who sent us there.”</blockquote><button className="button gold noPrint" onClick={()=>window.print()}>Print keepsake ↓</button></div>}
function Settings({wedding,onSaved}:{wedding:Wedding;onSaved:(w:Wedding)=>void}){
 const[form,setForm]=useState(wedding),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 const change=(key:keyof Wedding,value:string)=>setForm(v=>({...v,[key]:value}));
 async function save(e:FormEvent){e.preventDefault();setSaving(true);setMessage("");const client=getSupabaseBrowserClient();const updates={partner_one_name:form.partner_one_name,partner_two_name:form.partner_two_name,wedding_date:form.wedding_date||null,title:form.title,welcome_message:form.welcome_message,accent_color:form.accent_color,updated_at:new Date().toISOString()};const{data,error}=await client!.from("weddings").update(updates).eq("id",wedding.id).select().single();setSaving(false);if(error)setMessage(error.message);else{onSaved(data as Wedding);setMessage("Saved.")}}
 return <form className="panel settings" onSubmit={save}><h3>Wedding details</h3><div className="twoCols"><label>Partner one<input value={form.partner_one_name} onChange={e=>change("partner_one_name",e.target.value)} required/></label><label>Partner two<input value={form.partner_two_name} onChange={e=>change("partner_two_name",e.target.value)} required/></label></div><label>Wedding date<input type="date" value={form.wedding_date||""} onChange={e=>change("wedding_date",e.target.value)}/></label><label>Map title<input value={form.title} onChange={e=>change("title",e.target.value)} required/></label><label>Welcome message<textarea value={form.welcome_message} onChange={e=>change("welcome_message",e.target.value)}/></label><label>Accent color<select value={form.accent_color} onChange={e=>change("accent_color",e.target.value)}><option value="antique_gold">Antique Gold</option><option value="sage">Sage</option><option value="dusty_rose">Dusty Rose</option><option value="navy">Navy</option></select></label><button className="button gold" disabled={saving}>{saving?"Saving…":"Save changes"}</button>{message&&<p>{message}</p>}</form>
}
