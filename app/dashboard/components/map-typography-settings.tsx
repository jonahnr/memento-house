"use client";
import {useState,type CSSProperties} from "react";
import {typographyThemes,typographyTheme,type EventMetadata} from "../../../lib/map-presentation";
import {saveMapPresentation} from "../../../lib/map-settings-client";

export function MapTypographySettings({wedding,onSaved}:{wedding:{id:string;title:string;event_metadata?:EventMetadata};onSaved:(map:any)=>void}){
 const [selected,setSelected]=useState(typographyTheme(wedding.event_metadata?.typography_theme).id),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 const theme=typographyTheme(selected);
 async function save(){setSaving(true);setMessage("");try{onSaved(await saveMapPresentation(wedding.id,{typography_theme:selected}));setMessage("Guest Map typography saved.")}catch(error){setMessage((error as Error).message)}finally{setSaving(false)}}
 return <section className="panel typographySettings"><h3>Guest Map typography</h3><p>Choose a coordinated pairing for this map. Classic keeps the original appearance.</p><div className="typographyChoices">{typographyThemes.map(option=><label key={option.id}><input type="radio" name="typography" value={option.id} checked={selected===option.id} onChange={()=>{setSelected(option.id);setMessage("")}}/><span><b>{option.name}</b><small>{option.description}</small></span></label>)}</div><div className="guestTypographyPreview" data-typography={selected} style={{"--guest-heading":theme.headline,"--guest-body":theme.body,"--guest-accent":theme.accent} as CSSProperties}><span className="typographyAccent">People, places &amp; memories</span><h2>{wedding.title}</h2><p>Every place holds part of the story. Add a place and explore the moments that bring everyone together.</p></div><button type="button" className="button gold" disabled={saving} onClick={()=>void save()}>{saving?"Saving…":"Save typography"}</button>{message&&<p role="status">{message}</p>}</section>
}
