"use client";

import {useEffect,useRef,useState} from "react";

const experiences=[
 {id:"wedding",name:"Wedding",icon:"♡",href:"/memento-map/wedding",image:"/brand/celebrations/wedding-1.webp",alt:"A couple and guests taking part at a wedding",description:"Gather guest origins, meaningful recommendations, and the places behind your shared story.",prompt:"Guests can contribute in moments, then you can revisit their places and ideas after the wedding."},
 {id:"family-reunion",name:"Family Reunion",icon:"⌂",href:"/memento-map/family-reunion",image:"/brand/celebrations/family-reunion-1.webp",alt:"Several generations celebrating at a family reunion",description:"Bring family origins, homes, trips, and stories together across generations.",prompt:"Invite relatives near and far to add the places that connect each branch of the family."},
 {id:"celebration-of-life",name:"Celebration of Life",icon:"✦",href:"/memento-map/celebration-of-life",image:"/brand/experiences/celebration-of-life.webp",alt:"Family and friends sharing memories at a celebration of life",description:"Preserve the meaningful places and memories that help tell a life story.",prompt:"A calm contribution experience gives invited family and friends a clear way to remember together."},
 {id:"next-chapter",name:"Next Chapter",icon:"↗",href:"/memento-map/next-chapter",image:"/brand/experiences/next-chapter.webp",alt:"Friends celebrating a graduate's next chapter",description:"Connect the road so far with the possibilities, wishes, and places still ahead.",prompt:"Use it for graduation, retirement, a move, a career change, or another meaningful transition."},
 {id:"events-communities",name:"Events & Communities",icon:"◎",href:"/memento-map/events-communities",image:"/brand/experiences/events-community.webp",alt:"Neighbors participating in a community gathering",description:"Reveal a gathering's geographic reach and the shared history behind it.",prompt:"Collect attendee origins and community memories, display the map, and preserve a finished record."},
 {id:"anniversary",name:"Anniversary",icon:"♡",href:"/memento-map/anniversary",image:"/brand/celebrations/anniversary-1.webp",alt:"A couple revisiting shared memories together",description:"Revisit your years together and gather ideas for the adventures ahead.",prompt:"Map the homes, trips, traditions, and people that shaped your relationship."}
] as const;

export function ExperienceSelector(){
 const [selected,setSelected]=useState(0),track=useRef<HTMLDivElement>(null),scrollFrame=useRef<number|null>(null);
 const center=(index:number,behavior:ScrollBehavior="smooth")=>{setSelected(index);track.current?.children[index]?.scrollIntoView({behavior,block:"nearest",inline:"center"})};
 useEffect(()=>{track.current?.children[0]?.scrollIntoView({behavior:"auto",block:"nearest",inline:"center"})},[]);
 const onScroll=()=>{if(scrollFrame.current!==null)cancelAnimationFrame(scrollFrame.current);scrollFrame.current=requestAnimationFrame(()=>{const root=track.current;if(!root)return;const middle=root.getBoundingClientRect().left+root.clientWidth/2;let closest=0,distance=Infinity;Array.from(root.children).forEach((child,index)=>{const rect=child.getBoundingClientRect(),next=Math.abs(rect.left+rect.width/2-middle);if(next<distance){closest=index;distance=next}});setSelected(closest)})};
 const item=experiences[selected];
 return <section className="experienceSelector" id="experiences" aria-labelledby="experience-selector-title">
  <header><div className="eyebrow">Start with the right experience</div><h2 id="experience-selector-title">What are you bringing together?</h2><p>Choose an experience to see the prompts, examples, and packages made for that moment.</p></header>
  <div className="experienceCarousel">
   <button type="button" className="experienceArrow previous" aria-label="Previous experience" disabled={selected===0} onClick={()=>center(Math.max(0,selected-1))}>←</button>
   <div className="experienceTrack" ref={track} onScroll={onScroll} aria-label="Memento Map experiences">
    {experiences.map((experience,index)=><button type="button" className={`experienceOption ${selected===index?"selected":""}`} aria-pressed={selected===index} onClick={()=>center(index)} key={experience.id}><img src={experience.image} alt={experience.alt}/><span>{experience.icon}</span><b>{experience.name}</b></button>)}
   </div>
   <button type="button" className="experienceArrow next" aria-label="Next experience" disabled={selected===experiences.length-1} onClick={()=>center(Math.min(experiences.length-1,selected+1))}>→</button>
  </div>
  <article className="experienceDetail" aria-live="polite"><div><small>SELECTED EXPERIENCE</small><h3>{item.icon} {item.name}</h3></div><p>{item.description} {item.prompt}</p><a className="button gold" href={item.href}>Explore {item.name} →</a></article>
 </section>
}
