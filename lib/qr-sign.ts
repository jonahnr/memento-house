import QRCode from "qrcode";
import {mapTypeConfig,type MementoMapType} from "./memento-map-types";
import {eventQrUrl} from "./map-presentation";

export const qrLayouts={single:{label:"Full-page sign · 8.5 × 11 inches",width:8.5,height:11},double:{label:"Two landscape cards · 8.5 × 11 sheet",width:8.5,height:11},"4x6":{label:"Small sign · 4 × 6 inches",width:4,height:6},"5x7":{label:"Table sign · 5 × 7 inches",width:5,height:7}} as const;
export type QrLayout=keyof typeof qrLayouts;
export const qrDesigns={classic:{name:"Classic Gold",paper:"#fffdf8",ink:"#282621",accent:"#9a7441"},garden:{name:"Garden Sage",paper:"#f4f6ef",ink:"#263d30",accent:"#79856c"},editorial:{name:"Modern Editorial",paper:"#fffefb",ink:"#282621",accent:"#282621"},"lavender-sage":{name:"Lavender & Sage",paper:"#f1eaf5",ink:"#4d315e",accent:"#64774f"},"botanical-frame":{name:"Botanical Frame",paper:"#f7f5ed",ink:"#365643",accent:"#71866f"},"rose-ribbon":{name:"Rose Ribbon",paper:"#fff8f6",ink:"#633b40",accent:"#b2787e"},"midnight-gold":{name:"Midnight Gold",paper:"#222833",ink:"#f8f0e3",accent:"#d8b778"},"coastal-blue":{name:"Coastal Blue",paper:"#f2f8f8",ink:"#315f69",accent:"#4f7f89"},"terracotta-arch":{name:"Terracotta Arch",paper:"#fcf2e9",ink:"#713c2d",accent:"#a8593f"},"champagne-lines":{name:"Champagne Lines",paper:"#fffaf0",ink:"#40382d",accent:"#987039"}} as const;
export type QrDesign=keyof typeof qrDesigns;
export type SignEvent={partner_one_name:string;partner_two_name:string;title:string;wedding_date?:string|null;map_type?:MementoMapType;map_subtype?:string};
export function qrSignCopy(event:SignEvent,tier:string){
 const config=mapTypeConfig(event.map_type,event.map_subtype),couple=!event.map_type||event.map_type==="wedding";
 return {name:couple?[event.partner_one_name,event.partner_two_name].filter(Boolean).join(" & ")||event.title:event.title||config.name,
  secondary:event.map_type==="celebration_of_life"?"to Their Map":event.map_type==="next_chapter"?"to the Next Chapter":"to Our Map",
  supporting:`Help build this ${config.eventSingular} map with meaningful places, travel recommendations${tier==="timeline-plus"?", and memories":""}.`,
  instructions:[{title:"Scan the QR code",text:"Open your camera and scan to get started."},{title:"Add a place",text:"Share where you came from or recommend a place to visit."},{title:"Add your recommendation",text:"Tell us why this place matters, then submit your pin."},...(tier==="timeline-plus"?[{title:"Next, share a memory",text:"Share a dated memory, or skip to explore the map."}]:[{title:"Explore the map",text:"See the places everyone has shared."}]) ]};
}
const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("The sign image could not load. Please try again."));image.src=src});

// A fixed print canvas is both the preview and the export: dashboard width never affects composition.
export async function renderQrSign(event:SignEvent,mapUrl:string,tier:string,layout:QrLayout,design:QrDesign){
 await document.fonts.ready;
 const size=qrLayouts[layout],canvas=document.createElement("canvas");canvas.width=Math.round(size.width*300);canvas.height=Math.round(size.height*300);
 const ctx=canvas.getContext("2d")!;if(!ctx)throw new Error("This browser could not prepare the sign.");
 const colors=qrDesigns[design],copy=qrSignCopy(event,tier),logo=await loadImage("/brand/memento-house-logo-print.webp");
 const qr=document.createElement("canvas");await QRCode.toCanvas(qr,eventQrUrl(mapUrl),{width:1200,margin:4,errorCorrectionLevel:"H",color:{dark:"#26231f",light:"#ffffff"}});
 function text(value:string,x:number,y:number,width:number,fontSize:number,font="Georgia",align:CanvasTextAlign="center",maxLines=2){
  let lines:string[]=[];let size=fontSize;
  do{ctx.font=`${size}px ${font}`;lines=[];let line="";for(const word of value.split(/\s+/)){if(line&&ctx.measureText(`${line} ${word}`).width>width){lines.push(line);line=word}else line=line?`${line} ${word}`:word}if(line)lines.push(line);if(lines.length<=maxLines&&lines.every(line=>ctx.measureText(line).width<=width))break;size-=1}while(size>8);
  ctx.textAlign=align;ctx.textBaseline="top";lines.forEach((line,index)=>ctx.fillText(line,x,y+index*size*1.22));
 }
 function drawCard(yOffset:number,cardHeight:number){
  ctx.save();ctx.translate(0,yOffset);const w=canvas.width,h=cardHeight,landscape=layout==="double";
  // Layout in normalized design units, preserving physical size and QR proportions.
  ctx.scale(w/850,w/850);const H=h/w*850;
  ctx.fillStyle=colors.paper;ctx.fillRect(0,0,850,H);ctx.strokeStyle=colors.accent;ctx.lineWidth=1.5;ctx.strokeRect(20,20,810,H-40);
  ctx.fillStyle=colors.ink;text(copy.name.toUpperCase(),425,landscape?36:H*.042,720,landscape?19:24,"Georgia","center",2);
  if(event.wedding_date){const date=new Date(`${event.wedding_date}T00:00:00Z`);if(!Number.isNaN(date.getTime())){ctx.fillStyle=colors.accent;text(new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"}).format(date),425,landscape?84:H*.10,700,landscape?13:18)}}
  ctx.fillStyle=colors.ink;text("ADD YOUR MARK",425,landscape?104:H*.149,740,landscape?44:69,"Georgia","center",1);
  ctx.fillStyle=colors.accent;text(copy.secondary,425,landscape?157:H*.232,730,landscape?30:49,"Georgia","center",1);
  ctx.fillStyle=colors.ink;text(copy.supporting,425,landscape?203:H*.305,710,landscape?15:21,"Georgia","center",2);
  const start=landscape?262:H*.41,step=landscape?46:H*.104;
  copy.instructions.forEach((instruction,index)=>{
   const y=start+index*step;ctx.fillStyle=colors.accent;ctx.beginPath();ctx.arc(67,y+14,landscape?13:18,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors.paper;text(String(index+1),67,y+(landscape?4:0),30,landscape?17:23);
   ctx.fillStyle=colors.ink;text(instruction.title,101,y-1,310,landscape?17:23,"Georgia","left",1);text(landscape?(["Open your camera and scan to get started.","Pin your origin or a place to visit.","Tell us why, then submit your pin.",tier==="timeline-plus"?"Share a memory, or skip to explore.":"Explore the places everyone shared."][index]):instruction.text,101,y+(landscape?20:33),300,landscape?12:21,"Georgia","left",3);
  });
  ctx.strokeStyle=colors.accent;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(435,start-8);ctx.lineTo(435,landscape?456:H*.805);ctx.stroke();
  const q=landscape?188:315,qx=landscape?541:474,qy=landscape?255:H*.415;
  ctx.fillStyle="#ffffff";ctx.fillRect(qx-3,qy-3,q+6,q+6);ctx.imageSmoothingEnabled=false;ctx.drawImage(qr,qx,qy,q,q);ctx.imageSmoothingEnabled=true;
  ctx.fillStyle=colors.ink;text("START HERE",qx+q/2,qy+q+(landscape?9:24),330,landscape?21:34,"Georgia","center",1);ctx.fillStyle=colors.accent;text("Scan to add your mark",qx+q/2,qy+q+(landscape?35:72),330,landscape?14:20,"Georgia","center",1);
  ctx.strokeStyle=colors.accent;ctx.beginPath();ctx.moveTo(60,H-(landscape?52:164));ctx.lineTo(790,H-(landscape?52:164));ctx.stroke();
  ctx.fillStyle=colors.accent;
  if(landscape){ctx.drawImage(logo,337,H-47,26,26);text("MEMENTO HOUSE",375,H-40,280,11,"Georgia","left",1)}
  else{ctx.drawImage(logo,425-87/2,H-150,87,87);text("MEMENTO HOUSE",425,H-59,700,14,"Georgia","center",1);text("Made for the moment. Kept for a lifetime.",425,H-38,730,10,"Arial","center",1)}

  ctx.restore();
 }
 drawCard(0,layout==="double"?canvas.height/2:canvas.height);if(layout==="double")drawCard(canvas.height/2,canvas.height/2);
 return canvas;
}
