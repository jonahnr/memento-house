"use client";
import {useEffect,useRef,useState} from "react";
import type {Place,ResolvedPlace} from "../../../lib/location-search";

export function LocationSearch({value,onSelect,onQueryChange}:{value:string;onSelect:(place:ResolvedPlace)=>void;onQueryChange?:(value:string)=>void}){
 const[query,setQuery]=useState(value),[results,setResults]=useState<Place[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(""),[provider,setProvider]=useState("");
 const session=useRef("");
 useEffect(()=>setQuery(value),[value]);
 useEffect(()=>{
  setResults([]);setError("");setProvider("");
  if(query.trim().length<3||query===value){setLoading(false);return}
  const controller=new AbortController();setLoading(true);
  const timer=setTimeout(async()=>{
   try{
    const token=session.current||(session.current=crypto.randomUUID());
    const params=new URLSearchParams({q:query.trim(),session:token});
    const response=await fetch(`/api/location-search?${params}`,{signal:controller.signal});
    const json=await response.json();if(!response.ok)throw new Error(json.error||"Search failed");
    if(controller.signal.aborted)return;
    setResults(json.places||[]);setProvider(json.provider||"");
    if(json.partial)setError("Some search results are temporarily unavailable. You can select a result below or try again.");
    else if(!json.places?.length)setError("No matches yet. Keep typing the street, city, state, or ZIP code.");
   }catch{if(!controller.signal.aborted)setError("Location search is unavailable right now. Please try again.")}
   finally{if(!controller.signal.aborted)setLoading(false)}
  },350);
  return()=>{clearTimeout(timer);controller.abort()};
 },[query,value]);
 async function select(place:Place){
  setError("");setLoading(true);
  try{
   let selected:ResolvedPlace;
   if(place.provider==="google"){
    const token=session.current||(session.current=crypto.randomUUID());
    const params=new URLSearchParams({placeId:place.id.replace(/^google-/,""),session:token});
    const response=await fetch(`/api/location-search?${params}`),json=await response.json();
    if(!response.ok||!json.place)throw new Error(json.error||"Place details failed");
    selected=json.place;
   }else{
    if(!Number.isFinite(place.lat)||!Number.isFinite(place.lng))throw new Error("Place coordinates missing");
    selected=place as ResolvedPlace;
   }
   setQuery(selected.name);setResults([]);setProvider("");session.current="";onSelect(selected);
  }catch{setError("That address could not be selected. Please try it again.")}
  finally{setLoading(false)}
 }
 return <div className="locationSearch" aria-busy={loading}>
  <input required aria-label="Search for a real address or location" placeholder="Start with a city, venue, address, or landmark…" value={query} onChange={e=>{setQuery(e.target.value);onQueryChange?.(e.target.value)}} autoComplete="street-address"/>
  {loading&&<span className="searchStatus" role="status">Searching real places…</span>}
  {error&&<span className="searchError" role="status">{error}</span>}
  {results.length>0&&<ul>{results.map(place=><li key={place.id+place.name}><button type="button" onClick={()=>select(place)}><b>{place.name}</b><small>{place.provider==="google"?"Google Maps address":place.precision==="street-estimate"?"Estimated street position · U.S. Census":`Map location: ${place.lat?.toFixed(5)}, ${place.lng?.toFixed(5)}`}</small></button></li>)}{provider==="google"&&<li className="googleAttribution" aria-label="Results provided by Google Maps">Google Maps</li>}</ul>}
  {value&&query===value&&<div className="coordinateConfirmed">✓ Address selected and coordinates saved</div>}
 </div>
}
