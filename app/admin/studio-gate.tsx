"use client";
import {useEffect,useRef,useState} from "react";
import {getSupabaseBrowserClient} from "../../lib/supabase";

export default function StudioGate({title,description,src}:{title:string;description:string;src:string}){
  const[state,setState]=useState<"loading"|"allowed"|"denied">("loading");
  const frame=useRef<HTMLIFrameElement>(null),[customization,setCustomization]=useState<any>();
  useEffect(()=>{(async()=>{const session=(await getSupabaseBrowserClient()?.auth.getSession())?.data.session;if(!session){location.href=`/login?next=${encodeURIComponent(location.pathname)}`;return}setState(session.user.email?.toLowerCase()==="jonahnr@gmail.com"?"allowed":"denied")})()},[]);
  useEffect(()=>{if(state!=="allowed")return;const order=new URLSearchParams(location.search).get("order");if(!order)return;(async()=>{const session=(await getSupabaseBrowserClient()?.auth.getSession())?.data.session,r=await fetch(`/api/admin/customization?order=${encodeURIComponent(order)}`,{headers:{authorization:`Bearer ${session?.access_token}`}}),j=await r.json();if(r.ok)setCustomization(j)})()},[state]);
  if(state==="loading")return <main className="adminStudioGate"><p>Verifying administrator access…</p></main>;
  if(state==="denied")return <main className="adminStudioGate"><a href="/dashboard">← Dashboard</a><h1>Administrator access required</h1><p>This production workspace is available only to the Memento House administrator.</p></main>;
  return <main className="adminStudioPage"><header><a href="/admin/orders">← Operations console</a><div><span className="eyebrow">Private production studio</span><h1>{title}</h1><p>{customization?"The customer’s saved checkout design is loaded below. Review it, make production adjustments, then export.":description}</p></div></header><iframe ref={frame} onLoad={()=>customization&&frame.current?.contentWindow?.postMessage({type:"load-order-customization",payload:customization.payload},location.origin)} className="adminEmbeddedStudio" title={title} src={src}/></main>
}
