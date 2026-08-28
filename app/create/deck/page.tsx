"use client";
import {useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import {deckTiers} from "../../../lib/product-tiers";

export default function DeckBuilder(){
 const params=useSearchParams(),requested=params.get("tier")||"essential",initialTier=deckTiers.some(x=>x.id===requested)?requested:"essential";
 const[tier,setTier]=useState(initialTier),[summary,setSummary]=useState<any>(),[ready,setReady]=useState(false);
 useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.origin!==location.origin||event.data?.type!=="memento-deck-customization")return;localStorage.setItem("memento-builder:deck",JSON.stringify({kind:"deck",project:event.data.project,summary:event.data.summary,tier:event.data.tier}));setTier(event.data.tier);setSummary(event.data.summary);setReady(true)};addEventListener("message",receive);return()=>removeEventListener("message",receive)},[]);
 const selected=deckTiers.find(x=>x.id===tier)||deckTiers[0];
 return <main className="embeddedStudioPage"><a href="/memento-deck" className="textLink">← Memento Deck</a><header><div className="eyebrow">Interactive customization studio</div><h1>Create your Memento Deck</h1><p>Choose your collection, couple details, photo, and style. Your design is saved with checkout so production begins from what you created.</p></header><iframe className="embeddedStudio" title="Memento Deck interactive preview" src={`/studios/deck/index.html?mode=demo&tier=${encodeURIComponent(initialTier)}`}/><div className="studioCheckout"><div><b>{ready?`${selected.name} · $${selected.price}`:"Your customization saves automatically"}</b><p>{summary?`${summary.partner1||"Partner one"} + ${summary.partner2||"Partner two"} · ${summary.theme} · ${summary.palette}${summary.photo?" · photo added":" · add a photo above"}`:"Complete Couple, Photo, and Style above. Story and Bespoke unlock their deeper production options after purchase."}</p></div><a href={`/order?product=deck&tier=${encodeURIComponent(tier)}`} className="button gold">Continue with {selected.name} →</a></div></main>
}
