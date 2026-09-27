"use client";
import {useRef,useState} from "react";
import {mapTiers,orderHref} from "../../lib/product-tiers";
import {MEMENTO_MAP_TYPE_IDS,mapTypeConfig,MAP_OCCASIONS} from "../../lib/memento-map-types";
import {PricingCard} from "./pricing-card";

export function GeneralMapPricing(){
 const [selectedTier,setSelectedTier]=useState(mapTiers[0].id),dialog=useRef<HTMLDialogElement>(null);
 function choose(tier:string){setSelectedTier(tier);dialog.current?.showModal()}
 const categories=[...MEMENTO_MAP_TYPE_IDS.map(type=>({type,name:mapTypeConfig(type).name,occasion:""})),{type:MAP_OCCASIONS.anniversary.type,name:MAP_OCCASIONS.anniversary.name,occasion:"anniversary"}];
 return <section className="pricingSection" id="pricing"><div className="eyebrow">Memento Map packages</div><h2>Choose the package for your moment.</h2><p className="pricingIntro">Choose your package, then tell us what you’re celebrating.</p><div className="pricingGrid three">{mapTiers.map(tier=><PricingCard key={tier.id} {...tier} href="#map-category" onChoose={()=>choose(tier.id)}/>)}</div>
 <dialog ref={dialog} className="mapCategoryDialog" aria-labelledby="map-category-title" onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close()}}><div><button type="button" className="modalClose" aria-label="Close category selection" onClick={()=>dialog.current?.close()}>×</button><div className="eyebrow">{mapTiers.find(tier=>tier.id===selectedTier)?.name}</div><h2 id="map-category-title">What are you creating your Memento Map for?</h2><p>Your selected package continues with you to checkout.</p><div className="mapCategoryChoices">{categories.map(category=><a className="button light" key={category.name} href={orderHref("map",selectedTier,category.type)+(category.occasion?`&occasion=${category.occasion}`:"")}>{category.name} →</a>)}</div><button type="button" className="textLink" onClick={()=>dialog.current?.close()}>Back to packages</button></div></dialog></section>
}
