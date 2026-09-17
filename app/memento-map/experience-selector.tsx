"use client";

import {useEffect,useRef,useState} from "react";
import {CELEBRATION_GROUPS} from "../../lib/celebrations";

const experiences=[
 {id:"wedding",name:"Wedding",icon:"♡",href:"/memento-map/wedding",image:"/brand/celebrations/wedding-1.webp",alt:"A couple and guests taking part at a wedding",description:"Gather guest origins, meaningful recommendations, and the places behind your shared story.",prompt:"Guests can contribute in moments, then you can revisit their places and ideas after the wedding."},
 {id:"family-reunion",name:"Family Reunion",icon:"⌂",href:"/memento-map/family-reunion",image:"/brand/celebrations/family-reunion-1.webp",alt:"Several generations celebrating at a family reunion",description:"Bring family origins, homes, trips, and stories together across generations.",prompt:"Invite relatives near and far to add the places that connect each branch of the family."},
 {id:"celebration-of-life",name:"Celebration of Life",icon:"✦",href:"/memento-map/celebration-of-life",image:"/brand/experiences/celebration-of-life.webp",alt:"Family and friends sharing memories at a celebration of life",description:"Preserve the meaningful places and memories that help tell a life story.",prompt:"A calm contribution experience gives invited family and friends a clear way to remember together."},
 {id:"next-chapter",name:"Next Chapter",icon:"↗",href:"/memento-map/next-chapter",image:"/brand/experiences/next-chapter.webp",alt:"Friends celebrating a graduate's next chapter",description:"Connect the road so far with the possibilities, wishes, and places still ahead.",prompt:"Use it for graduation, retirement, a move, a career change, or another meaningful transition."},
 {id:"events-communities",name:"Events & Communities",icon:"◎",href:"/memento-map/events-communities",image:"/brand/experiences/events-community.webp",alt:"Neighbors participating in a community gathering",description:"Reveal a gathering's geographic reach and the shared history behind it.",prompt:"Collect attendee origins and community memories, display the map, and preserve a finished record."},
 {id:"anniversary",name:"Anniversary",icon:"♡",href:"/memento-map/anniversary",image:"/brand/celebrations/anniversary-1.webp",alt:"A couple revisiting shared memories together",description:"Revisit your years together and gather ideas for the adventures ahead.",prompt:"Map the homes, trips, traditions, and people that shaped your relationship."}
] as const;

export function ExperienceSelector({celebrations=false}:{celebrations?:boolean}){
 const options=celebrations?CELEBRATION_GROUPS.map(occasion=>{const visual=experiences.find(item=>item.id===occasion.slug)!;return {...visual,id:occasion.slug,name:occasion.name,href:`/celebrations/${occasion.slug}`,image:({"celebration-of-life":"/brand/map-celebration-of-life-hero.webp","events-communities":"/brand/map-events-hero.webp","next-chapter":"/brand/map-next-chapter-hero.webp"} as Record<string,string>)[occasion.slug]||`/brand/celebrations/${occasion.slug}-1.webp`,description:occasion.intro,prompt:occasion.products.map(product=>product.name).join(" · ")}}):experiences;
 const sectionId=celebrations?"celebrations":"experiences",titleId=`${sectionId}-selector-title`;

 const [selected,setSelected]=useState(0),track=useRef<HTMLDivElement>(null),scrollTimer=useRef<ReturnType<typeof setTimeout>|null>(null),manualScroll=useRef(false);
 const center=(index:number)=>{manualScroll.current=false;if(scrollTimer.current)clearTimeout(scrollTimer.current);setSelected(index);const root=track.current,card=root?.children[index] as HTMLElement|undefined;if(root&&card){const left=card.offsetLeft-root.offsetLeft-(root.clientWidth-card.offsetWidth)/2;root.scrollTo({left:Math.max(0,left),behavior:"smooth"})}};
 useEffect(()=>()=>{if(scrollTimer.current)clearTimeout(scrollTimer.current)},[]);
 const onScroll=()=>{if(!manualScroll.current)return;if(scrollTimer.current)clearTimeout(scrollTimer.current);scrollTimer.current=setTimeout(()=>{const root=track.current;if(!root||!manualScroll.current)return;const middle=root.getBoundingClientRect().left+root.clientWidth/2;let closest=0,distance=Infinity;Array.from(root.children).forEach((child,index)=>{const rect=child.getBoundingClientRect(),next=Math.abs(rect.left+rect.width/2-middle);if(next<distance){closest=index;distance=next}});setSelected(closest)},150)};
 const item=options[selected];
 return <section className={`experienceSelector ${celebrations?"celebrationExperienceSelector":""}`} id={sectionId} aria-labelledby={titleId}>
  <header><div className="eyebrow">{celebrations?"Shop by celebration":"Start with the right experience"}</div><h2 id={titleId}>{celebrations?<>Made for your moment.<br/><em>Kept through every chapter.</em></>:"What are you bringing together?"}</h2><p>{celebrations?"Choose the occasion, then the keepsake your people will help create.":"Choose an experience to see the prompts, examples, and packages made for that moment."} Select a card, then click anywhere on it to explore.</p></header>
  <div className="experienceCarousel">
   <button type="button" className="experienceArrow previous" aria-label="Previous experience" disabled={selected===0} onClick={()=>center(Math.max(0,selected-1))}>←</button>
   <div className="experienceTrack" ref={track} onScroll={onScroll} onPointerDown={()=>{manualScroll.current=true}} onWheel={()=>{manualScroll.current=true}} aria-label={celebrations?"Shop by celebration":"Memento Map experiences"}>
    {options.map((experience,index)=><div className={`experienceOption ${selected===index?"selected":""}`} key={experience.id}><a href={experience.href} aria-label={`Explore ${experience.name}`} onClick={event=>{if(selected!==index&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();center(index)}}}><img src={experience.image} alt={experience.alt}/><span className="experienceSelect"><span aria-hidden="true">{experience.icon}</span><b>{experience.name}</b>{celebrations&&<small className="experienceProducts">{experience.prompt}</small>}</span></a></div>)}
   </div>
   <button type="button" className="experienceArrow next" aria-label="Next experience" disabled={selected===options.length-1} onClick={()=>center(Math.min(options.length-1,selected+1))}>→</button>
  </div>
  <article className="experienceDetail" aria-live="polite"><div><small>SELECTED EXPERIENCE</small><h3>{item.icon} {item.name}</h3></div><p>{item.description} {item.prompt}</p><a className="button gold" href={item.href}>Explore {item.name} →</a></article>
 </section>
}
