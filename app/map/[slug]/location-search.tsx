"use client";
import {useEffect,useState} from "react";
type Place={name:string;lat:number;lng:number;id:string};
export function LocationSearch({value,onSelect}:{value:string;onSelect:(place:Place)=>void}){
 const[query,setQuery]=useState(value),[results,setResults]=useState<Place[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
 useEffect(()=>setQuery(value),[value]);
 useEffect(()=>{if(query.trim().length<3||query===value){setResults([]);return}const controller=new AbortController(),timer=setTimeout(async()=>{setLoading(true);setError("");try{const response=await fetch(`/api/location-search?q=${encodeURIComponent(query.trim())}`,{signal:controller.signal});const json=await response.json();if(!response.ok)throw new Error();setResults(json.places||[])}catch(e){if((e as Error).name!=="AbortError")setError("Location search is unavailable right now. Please try again.")}finally{setLoading(false)}},350);return()=>{clearTimeout(timer);controller.abort()}},[query,value]);
 return <div className="locationSearch"><input required aria-label="Search for a real address or location" placeholder="Start with a city, venue, address, or landmark…" value={query} onChange={e=>setQuery(e.target.value)} autoComplete="street-address"/>{loading&&<span className="searchStatus">Searching real places…</span>}{error&&<span className="searchError">{error}</span>}{results.length>0&&<ul>{results.map(place=><li key={place.id+place.name}><button type="button" onClick={()=>{setQuery(place.name);setResults([]);onSelect(place)}}><b>{place.name}</b><small>Exact pin: {place.lat.toFixed(5)}, {place.lng.toFixed(5)}</small></button></li>)}</ul>}{value&&query===value&&<div className="coordinateConfirmed">✓ Address selected and coordinates saved</div>}</div>
}
