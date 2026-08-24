"use client";
import {useEffect,useState} from "react";
import {getSupabaseBrowserClient} from "../../lib/supabase";

export default function StudioGate({title,description,src}:{title:string;description:string;src:string}){
  const[state,setState]=useState<"loading"|"allowed"|"denied">("loading");
  useEffect(()=>{(async()=>{const session=(await getSupabaseBrowserClient()?.auth.getSession())?.data.session;if(!session){location.href=`/login?next=${encodeURIComponent(location.pathname)}`;return}setState(session.user.email?.toLowerCase()==="jonahnr@gmail.com"?"allowed":"denied")})()},[]);
  if(state==="loading")return <main className="adminStudioGate"><p>Verifying administrator access…</p></main>;
  if(state==="denied")return <main className="adminStudioGate"><a href="/dashboard">← Dashboard</a><h1>Administrator access required</h1><p>This production workspace is available only to the Memento House administrator.</p></main>;
  return <main className="adminStudioPage"><header><a href="/admin/orders">← Operations console</a><div><span className="eyebrow">Private production studio</span><h1>{title}</h1><p>{description}</p></div></header><iframe className="adminEmbeddedStudio" title={title} src={src}/></main>
}
