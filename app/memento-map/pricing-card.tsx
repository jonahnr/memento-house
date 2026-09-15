"use client";

import {useState} from "react";
import {PurchaseTerms} from "./purchase-terms";

type PricingCardProps={id:string;name:string;price:number;subtitle:string;features:string[];cta:string;href:string;popular?:boolean};

export function PricingCard({id,name,price,subtitle,features,cta,href,popular}:PricingCardProps){
 const[details,setDetails]=useState(false);
 return <article className={`priceCard priceFlipCard ${popular?"popular":""} ${details?"showDetails":""}`}>
  {popular&&<span className="popularTag">MOST POPULAR</span>}
  <div className="priceCardFace priceCardOverview" aria-hidden={details} inert={details?true:undefined}>
   <div><h3>{name}</h3><strong>${price}</strong><p>{subtitle}</p></div>
   <ul className="priceIncluded" aria-label={`Included with ${name}`}>{features.map(feature=><li key={feature}>✓ {feature}</li>)}</ul>
   <button type="button" className="priceDetailsToggle" onClick={()=>setDetails(true)}>Purchase and fulfillment details →</button>
   <a href={href} className="button gold">{cta} →</a>
  </div>
  <div className="priceCardFace priceCardDetails" aria-hidden={!details} inert={!details?true:undefined}>
   <div className="priceDetailsHeading"><div><small>{name}</small><h3>Purchase details</h3></div><button type="button" onClick={()=>setDetails(false)} aria-label={`Return to ${name} package overview`}>×</button></div>
   <PurchaseTerms tier={id}/>
   <button type="button" className="priceDetailsToggle" onClick={()=>setDetails(false)}>← Back to overview</button>
  </div>
 </article>
}
