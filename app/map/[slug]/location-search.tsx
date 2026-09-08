"use client";
import {useEffect,useState} from "react";
import type {Place} from "../../../lib/location-search";
export function LocationSearch({value,onSelect}:{value:string;onSelect:(place:Place)=>void}){
 const[query,setQuery]=useState(value),[results,setResults]=useState<Place[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
 useEffect(()=>setQuery(value),[value]);
 useEffect(()=>{
  setResults([]);setError("");
  if(query.trim().length<3||query===value){setLoading(false);return}
  const controller=new AbortController();setLoading(true);
  const timer=setTimeout(async()=>{
   try{
    const response=await fetch(`/api/location-search?q=${encodeURIComponent(query.trim())}`,{signal:controller.signal});
    const json=await response.json();if(!response.ok)throw new Error();
    if(controller.signal.aborted)return;
    setResults(json.places||[]);
    if(json.partial)setError("Some search results are temporarily unavailable. You can select a result below or try again.");
    else if(!json.places?.length)setError("No matches yet. Try the full street address, city, state, and ZIP code.");
   }catch{if(!controller.signal.aborted)setError("Location search is unavailable right now. Please try again.")}
   finally{if(!controller.signal.aborted)setLoading(false)}
  },350);
  return()=>{clearTimeout(timer);controller.abort()};
 },[query,value]);
 return <div className="locationSearch"><input required aria-label="Search for a real address or location" placeholder="Start with a city, venue, address, or landmark…" value={query} onChange={e=>setQuery(e.target.value)} autoComplete="street-address"/>{loading&&<span className="searchStatus" role="status">Searching real places…</span>}{error&&<span className="searchError" role="status">{error}</span>}{results.length>0&&<ul>{results.map(place=><li key={place.id+place.name}><button type="button" onClick={()=>{setQuery(place.name);setResults([]);onSelect(place)}}><b>{place.name}</b><small>{place.precision==="street-estimate"?"Estimated street position · U.S. Census":"Map location"}: {place.lat.toFixed(5)}, {place.lng.toFixed(5)}</small></button></li>)}</ul>}{value&&query===value&&<div className="coordinateConfirmed">✓ Address selected and coordinates saved</div>}</div>
}
