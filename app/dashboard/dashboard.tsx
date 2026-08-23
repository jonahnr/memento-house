"use client";

import Link from "next/link";
import {FormEvent,useCallback,useEffect,useRef,useState} from "react";
import QRCode from "qrcode";
import {getSupabaseBrowserClient} from "../../lib/supabase";
import {AdventureMap,type GeoPin} from "../map/[slug]/adventure-map";

type Wedding={id:string;partner_one_name:string;partner_two_name:string;wedding_date:string|null;title:string;slug:string;welcome_message:string;accent_color:string};
type Recommendation={id:string;guest_name:string;message:string;category:string|null;status:"active"|"hidden"|"deleted";destination:{id:string;location_name:string;latitude:number;longitude:number}|null};
type TravelStatus={destination_id:string;status:"want_to_go"|"planning"|"visited";planned_date:string|null;visited_date:string|null;couple_note:string|null;image_url:string|null};
const items=["Overview","Our Story","Recommendations","Travel Journal","Wedding Map","QR Code","Keepsake","Settings"];

const prettyDate=(value:string|null,short=false)=>{
 if(!value)return "Wedding date to come";
 return new Intl.DateTimeFormat("en-US",{month:short?"short":"long",day:"numeric",year:"numeric",weekday:short?undefined:"long",timeZone:"UTC"}).format(new Date(value+"T00:00:00Z"));
};

export function Dashboard(){
 const[section,setSection]=useState("Overview"),[wedding,setWedding]=useState<Wedding|null>(null),[data,setData]=useState<Recommendation[]>([]);
 const[tier,setTier]=useState("map"),[travel,setTravel]=useState<TravelStatus[]>([]);
 const[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{
  const client=getSupabaseBrowserClient(); if(!client){setError("Account service is not available.");setLoading(false);return}
  const{data:session}=await client.auth.getSession(); const user=session.session?.user;
  if(!user){setLoading(false);return}
  setTier(String(user.user_metadata?.product_tier||"map"));
  const{data:w,error:wError}=await client.from("weddings").select("id,partner_one_name,partner_two_name,wedding_date,title,slug,welcome_message,accent_color").eq("owner_user_id",user.id).single();
  if(wError||!w){setError(wError?.message||"Your wedding workspace could not be found.");setLoading(false);return}
  setWedding(w as Wedding);
  const{data:r,error:rError}=await client.from("recommendations").select("id,guest_name,message,category,status,destination:destinations(id,location_name,latitude,longitude)").eq("wedding_id",w.id).neq("status","deleted").order("created_at",{ascending:false});
  if(rError)setError(rError.message); else setData((r||[]) as unknown as Recommendation[]);
  const{data:t}=await client.from("couple_destination_status").select("destination_id,status,planned_date,visited_date,couple_note,image_url").eq("wedding_id",w.id);setTravel((t||[]) as TravelStatus[]);
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
  <aside><Link href="/" className="brand"><img src="/brand/memento-house-logo.webp" alt="Memento House"/><span>Memento <i>Map</i><small>by Memento House</small></span></Link>
   <div className="coupleChip"><span>{initials[0]}<span>&</span>{initials[1]}</span><div><b>{names}</b><small>{prettyDate(wedding.wedding_date,true)}</small></div></div>
   <div className="planBadge"><small>CURRENT PLAN</small><b>{tier==="map"?"Memento Map":tier==="plus"?"Map Plus":"Map Keepsake"}</b></div>
   <nav>{items.filter(x=>tier!=="map"||!(["Travel Journal","Keepsake"].includes(x))).map(x=>{const i=items.indexOf(x);return <button key={x} onClick={()=>setSection(x)} className={section===x?"active":""}><i>{["⌂","♥","✦","✓","⌖","▦","◇","⚙"][i]}</i>{x}</button>})}</nav>
   <div className="dashboardExit"><a href="/">← Memento House home</a><a href="/#keepsakes">Browse all keepsakes</a><a href={mapPath}>↗ Open adventure map</a></div>
  </aside>
  <section className="dashMain"><header><div><small>{names.toUpperCase()}’S WEDDING</small><h1>{section}</h1></div><div className="dashActions"><span>{initials}</span></div></header>
   {error&&<div className="authError">{error}</div>}
   {section==="Overview"&&<Overview wedding={wedding} recommendations={data} mapPath={mapPath} onSection={setSection}/>}
   {section==="Recommendations"&&<Recommendations rows={data} onStatus={setStatus} onRemove={remove}/>}
   {section==="Travel Journal"&&tier!=="map"&&<TravelJournal wedding={wedding} rows={data} values={travel} onChange={setTravel}/>}
   {section==="Our Story"&&<Empty title="The places that made you, you." text="Add milestones from your relationship so guests can see the story behind the map." action="Story editor coming next"/>}
   {section==="Wedding Map"&&<WeddingMapPanel wedding={wedding} recommendations={data} mapPath={mapPath}/>}
   {section==="QR Code"&&<QR wedding={wedding} mapUrl={mapUrl}/>}
   {section==="Keepsake"&&tier!=="map"&&<Keepsake wedding={wedding} recommendations={data}/>}
   {section==="Settings"&&<Settings wedding={wedding} onSaved={setWedding}/>}
  </section>
 </main>
}

function Overview({wedding,recommendations,mapPath,onSection}:{wedding:Wedding;recommendations:Recommendation[];mapPath:string;onSection:(s:string)=>void}){
 const unique=new Set(recommendations.map(r=>r.destination?.location_name).filter(Boolean)).size;
 return <><div className="welcome"><div><div className="eyebrow">{prettyDate(wedding.wedding_date)}</div><h2>Your adventure is taking shape.</h2><p>{wedding.welcome_message}</p></div><div><a href={mapPath} className="button light">View guest map ↗</a><button className="button gold" onClick={()=>onSection("QR Code")}>Open QR card</button></div></div>
 <div className="stats"><article><span>✦</span><b>{unique}</b><small>Places recommended</small></article><article><span>♡</span><b>{recommendations.length}</b><small>Guest contributions</small></article><article><span>⌁</span><b>{recommendations.filter(r=>r.status==="active").length}</b><small>Visible suggestions</small></article><article><span>↗</span><b>{recommendations[0]?.destination?.location_name||"Waiting"}</b><small>Latest place</small></article></div>
 <div className="panel"><div className="panelHead"><div><small>LIVE ACTIVITY</small><h3>Recent recommendations</h3></div><button onClick={()=>onSection("Recommendations")}>View all →</button></div>{recommendations.length?recommendations.slice(0,5).map(r=><div className="activity" key={r.id}><span>✦</span><div><b>{r.destination?.location_name||"Saved place"}</b><small>Recommended by {r.guest_name}</small></div><time>{r.status}</time></div>):<p>No guest recommendations yet. Share your guest map to begin.</p>}</div></>
}

function Recommendations({rows,onStatus,onRemove}:{rows:Recommendation[];onStatus:(id:string,s:"active"|"hidden")=>void;onRemove:(id:string)=>void}){
 return <div className="panel manage"><div className="panelHead"><div><small>MODERATION</small><h3>Guest recommendations</h3><p>Hide suggestions without losing them, or remove them from your collection.</p></div></div>{rows.length?rows.map(r=><div className="manageRow" key={r.id}><div><b>{r.destination?.location_name||"Saved place"}</b><small>{r.guest_name}{r.category?` · ${r.category}`:""}</small></div><select value={r.status} onChange={e=>onStatus(r.id,e.target.value as "active"|"hidden")}><option value="active">Active</option><option value="hidden">Hidden</option></select><button onClick={()=>onRemove(r.id)}>Remove</button></div>):<p>No recommendations have been submitted yet.</p>}</div>
}

function TravelJournal({wedding,rows,values,onChange}:{wedding:Wedding;rows:Recommendation[];values:TravelStatus[];onChange:(v:TravelStatus[])=>void}){
 const places=Array.from(new Map(rows.filter(r=>r.destination&&r.category!=="Guest Origin").map(r=>[r.destination!.id,r.destination!])).values());
 const update=(id:string,key:keyof TravelStatus,value:string)=>onChange([...values.filter(v=>v.destination_id!==id),{destination_id:id,status:"want_to_go",planned_date:null,visited_date:null,couple_note:null,image_url:null,...values.find(v=>v.destination_id===id),[key]:value}]);
 async function save(id:string){const value=values.find(v=>v.destination_id===id)||{destination_id:id,status:"want_to_go" as const,planned_date:null,visited_date:null,couple_note:null,image_url:null};const client=getSupabaseBrowserClient();await client!.from("couple_destination_status").upsert({...value,wedding_id:wedding.id,updated_at:new Date().toISOString()},{onConflict:"wedding_id,destination_id"})}
 return <div className="panel travelJournal"><div className="panelHead"><div><small>MAP PLUS</small><h3>Your travel journal</h3><p>Move recommendations from Want to Go to Planning to Visited, add your notes, and attach a favorite photo.</p></div></div><div className="travelGrid">{places.map(place=>{const value=values.find(v=>v.destination_id===place.id)||{destination_id:place.id,status:"want_to_go",planned_date:null,visited_date:null,couple_note:null,image_url:null};return <article key={place.id}>{value.image_url&&<img src={value.image_url} alt="Couple travel memory"/>}<h4>{place.location_name}</h4><label>Journey status<select value={value.status} onChange={e=>update(place.id,"status",e.target.value)}><option value="want_to_go">Want to Go</option><option value="planning">Planning</option><option value="visited">Visited</option></select></label>{value.status==="planning"&&<label>Planned date<input type="date" value={value.planned_date||""} onChange={e=>update(place.id,"planned_date",e.target.value)}/></label>}{value.status==="visited"&&<label>Visited date<input type="date" value={value.visited_date||""} onChange={e=>update(place.id,"visited_date",e.target.value)}/></label>}<label>Memory or plan<textarea value={value.couple_note||""} onChange={e=>update(place.id,"couple_note",e.target.value)}/></label><label>Photo URL<input type="url" value={value.image_url||""} placeholder="https://…" onChange={e=>update(place.id,"image_url",e.target.value)}/></label><button className="button gold" onClick={()=>save(place.id)}>Save journey</button></article>})}</div>{!places.length&&<p>Guest travel recommendations will appear here once they are added.</p>}</div>
}

function Empty({title,text,action}:{title:string;text:string;action:string}){return <div className="empty"><span>♡</span><h2>{title}</h2><p>{text}</p><button className="button gold" disabled>{action}</button></div>}
const toPins=(rows:Recommendation[]):GeoPin[]=>rows.filter(r=>r.destination&&Number.isFinite(r.destination.latitude)&&Number.isFinite(r.destination.longitude)).map(r=>({id:r.id,place:r.destination!.location_name,guest:r.guest_name,message:r.message,category:r.category||"Adventure",likes:0,lat:r.destination!.latitude,lng:r.destination!.longitude}));
function WeddingMapPanel({wedding,recommendations,mapPath}:{wedding:Wedding;recommendations:Recommendation[];mapPath:string}){const pins=toPins(recommendations);return <div className="panel accountMapPanel"><div className="panelHead"><div><small>LIVE GUEST EXPERIENCE</small><h3>{wedding.title}</h3></div><a href={mapPath}>Open full map ↗</a></div><div className="accountMap"><AdventureMap recommendations={pins} stories={[]} tab="all" selected={null} onSelect={()=>{}}/></div><p>{pins.length?pins.length+" real locations are mapped from guest contributions.":"Share your public map to begin collecting guest origins and travel recommendations."}</p><a href={mapPath} className="button gold">Open live map ↗</a></div>}
function QR({wedding,mapUrl}:{wedding:Wedding;mapUrl:string}){const names=`${wedding.partner_one_name} & ${wedding.partner_two_name}`,[qr,setQr]=useState(""),[copied,setCopied]=useState(false);useEffect(()=>{QRCode.toDataURL(mapUrl,{width:720,margin:2,color:{dark:"#282621",light:"#fffdf8"},errorCorrectionLevel:"H"}).then(setQr)},[mapUrl]);return <div className="qrLayout"><div className="qrCard"><div className="eyebrow">{names}</div><h2>Help Build Our<br/><i>Adventure Map</i></h2><p>Scan to share where you came from or recommend a place for us to visit.</p>{qr?<img className="realQr" src={qr} alt={"Scannable QR code for "+names+"'s wedding map"}/>:<div className="qrLoading">Generating QR code…</div>}<b>{mapUrl.replace("https://","")}</b><small>THANK YOU FOR BEING PART OF OUR STORY</small></div><div className="qrTools"><h2>Your Real Wedding QR Code</h2><p>This code opens your unique public map and is ready for invitations or guest-table cards.</p><label>Guest map link<input value={mapUrl} readOnly/></label><a href={mapUrl} className="button gold">Open adventure map ↗</a><button className="button light" onClick={async()=>{await navigator.clipboard.writeText(mapUrl);setCopied(true);setTimeout(()=>setCopied(false),1800)}}>{copied?"Link copied ✓":"Copy link"}</button><button className="button light" onClick={()=>window.print()}>Print QR card ↓</button></div></div>}
function Keepsake({wedding,recommendations}:{wedding:Wedding;recommendations:Recommendation[]}){const pins=toPins(recommendations),capture=useRef<null|(()=>string)>(null),[exporting,setExporting]=useState(false);async function download(){if(!capture.current)return;setExporting(true);try{const mapUrl=capture.current(),mapImage=new Image();await new Promise<void>((resolve,reject)=>{mapImage.onload=()=>resolve();mapImage.onerror=reject;mapImage.src=mapUrl});const canvas=document.createElement("canvas");canvas.width=1800;canvas.height=2400;const ctx=canvas.getContext("2d")!;ctx.fillStyle="#fffdf8";ctx.fillRect(0,0,1800,2400);ctx.strokeStyle="#a77b3f";ctx.lineWidth=4;ctx.strokeRect(45,45,1710,2310);ctx.textAlign="center";ctx.fillStyle="#a77b3f";ctx.font="22px Georgia";ctx.fillText("OUR WEDDING WORLD",900,155);ctx.fillStyle="#282621";ctx.font="90px Georgia";ctx.fillText(`${wedding.partner_one_name} & ${wedding.partner_two_name}`,900,275);ctx.fillStyle="#786f64";ctx.font="30px Georgia";ctx.fillText(prettyDate(wedding.wedding_date),900,335);ctx.drawImage(mapImage,120,420,1560,1390);ctx.font="24px Georgia";ctx.fillText(`✦ ${pins.filter(p=>p.category!=="Guest Origin").length} places recommended     ⌂ ${pins.filter(p=>p.category==="Guest Origin").length} guest origins     ♡ ${recommendations.length} memories`,900,1885);ctx.font="italic 32px Georgia";ctx.fillText("May every place carry a memory of the people who sent us there.",900,2010);ctx.strokeStyle="#d7c9b4";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(150,2210);ctx.lineTo(1650,2210);ctx.stroke();ctx.fillStyle="#a77b3f";ctx.font="18px Arial";ctx.fillText("MEMENTO HOUSE · MADE FOR THE MOMENT. KEPT FOR A LIFETIME.",900,2265);const a=document.createElement("a");a.download=`${wedding.slug}-memento-map.png`;a.href=canvas.toDataURL("image/png");a.click()}finally{setExporting(false)}}return <div><div className="keepsakeSheet"><div className="keepsakeTitle"><div className="eyebrow">Our Wedding World</div><h2>{wedding.partner_one_name} <i>&</i> {wedding.partner_two_name}</h2><p>{prettyDate(wedding.wedding_date)}</p></div><div className="keepsakeRealMap"><AdventureMap recommendations={pins} stories={[]} tab="all" selected={null} onSelect={()=>{}} onSnapshotReady={fn=>{capture.current=fn}}/></div><div className="keepsakeLegend"><span>✦ {pins.filter(p=>p.category!=="Guest Origin").length} places recommended</span><span>⌂ {pins.filter(p=>p.category==="Guest Origin").length} guest origins</span><span>♡ {recommendations.length} memories</span></div><blockquote>“May every place carry a memory of the people who sent us there.”</blockquote><div className="keepsakeFooter">Memento House · Made for the moment. Kept for a lifetime.</div></div><div className="exportActions"><button className="button gold" disabled={exporting||!capture.current} onClick={download}>{exporting?"Preparing high-resolution PNG…":"Download keepsake PNG ↓"}</button><p>The export includes the real map, its pins, and a print-ready keepsake layout.</p></div></div>}
function Settings({wedding,onSaved}:{wedding:Wedding;onSaved:(w:Wedding)=>void}){
 const[form,setForm]=useState(wedding),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 const change=(key:keyof Wedding,value:string)=>setForm(v=>({...v,[key]:value}));
 async function save(e:FormEvent){e.preventDefault();setSaving(true);setMessage("");const client=getSupabaseBrowserClient();const updates={partner_one_name:form.partner_one_name,partner_two_name:form.partner_two_name,wedding_date:form.wedding_date||null,title:form.title,welcome_message:form.welcome_message,accent_color:form.accent_color,updated_at:new Date().toISOString()};const{data,error}=await client!.from("weddings").update(updates).eq("id",wedding.id).select().single();setSaving(false);if(error)setMessage(error.message);else{onSaved(data as Wedding);setMessage("Saved.")}}
 return <form className="panel settings" onSubmit={save}><h3>Wedding details</h3><div className="twoCols"><label>Partner one<input value={form.partner_one_name} onChange={e=>change("partner_one_name",e.target.value)} required/></label><label>Partner two<input value={form.partner_two_name} onChange={e=>change("partner_two_name",e.target.value)} required/></label></div><label>Wedding date<input type="date" value={form.wedding_date||""} onChange={e=>change("wedding_date",e.target.value)}/></label><label>Map title<input value={form.title} onChange={e=>change("title",e.target.value)} required/></label><label>Welcome message<textarea value={form.welcome_message} onChange={e=>change("welcome_message",e.target.value)}/></label><label>Accent color<select value={form.accent_color} onChange={e=>change("accent_color",e.target.value)}><option value="antique_gold">Antique Gold</option><option value="sage">Sage</option><option value="dusty_rose">Dusty Rose</option><option value="navy">Navy</option></select></label><button className="button gold" disabled={saving}>{saving?"Saving…":"Save changes"}</button>{message&&<p>{message}</p>}</form>
}
