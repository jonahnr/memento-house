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
  instructions:[{title:"Scan the QR code",text:"Open your camera and scan to get started."},{title:"Add a place",text:"Share where you came from or recommend a place to visit."},{title:"Leave us a note",text:"Share a recommendation, advice, or message with your pin."},...(tier==="timeline-plus"?[{title:"Next, share a memory",text:"Share a dated memory, or skip to explore the map."}]:[{title:"Explore the map",text:"See the places everyone has shared."}]) ]};
}
const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("The sign image could not load. Please try again."));image.src=src});
type WorldGeometry={type:"Polygon"|"MultiPolygon";coordinates:number[][][]|number[][][][]};
type WorldData={features:{geometry:WorldGeometry|null}[]};
const loadWorld=()=>fetch("/brand/world-countries.geo.json").then(response=>response.ok?response.json() as Promise<WorldData>:Promise.reject()).catch(()=>null);

// A fixed print canvas is both the preview and the export: dashboard width never affects composition.
export async function renderQrSign(event:SignEvent,mapUrl:string,tier:string,layout:QrLayout,design:QrDesign){
 await document.fonts.ready;
 const size=qrLayouts[layout],canvas=document.createElement("canvas");canvas.width=Math.round(size.width*300);canvas.height=Math.round(size.height*300);
 const ctx=canvas.getContext("2d")!;if(!ctx)throw new Error("This browser could not prepare the sign.");
 const colors=qrDesigns[design],copy=qrSignCopy(event,tier),[logo,world]=await Promise.all([loadImage("/brand/memento-house-logo-print.webp"),loadWorld()]);
 const qr=document.createElement("canvas");await QRCode.toCanvas(qr,eventQrUrl(mapUrl),{width:1200,margin:4,errorCorrectionLevel:"H",color:{dark:"#26231f",light:"#ffffff"}});
 function text(value:string,x:number,y:number,width:number,fontSize:number,font="Georgia",align:CanvasTextAlign="center",maxLines=2,weight="400"){
  let lines:string[]=[];let size=fontSize;
  do{ctx.font=`${weight} ${size}px ${font}`;lines=[];let line="";for(const word of value.split(/\s+/)){if(line&&ctx.measureText(`${line} ${word}`).width>width){lines.push(line);line=word}else line=line?`${line} ${word}`:word}if(line)lines.push(line);if(lines.length<=maxLines&&lines.every(line=>ctx.measureText(line).width<=width))break;size-=1}while(size>8);
  ctx.textAlign=align;ctx.textBaseline="top";lines.forEach((line,index)=>ctx.fillText(line,x,y+index*size*1.22));
 }
 function drawIcon(kind:number,x:number,y:number,size:number){
  const s=size/24;ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.strokeStyle=colors.ink;ctx.fillStyle="transparent";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineJoin="round";
  if(kind===0){ctx.beginPath();ctx.roundRect(5,0,14,24,2);ctx.stroke();ctx.beginPath();ctx.moveTo(10,3);ctx.lineTo(14,3);ctx.stroke();ctx.beginPath();ctx.arc(12,21,1,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.roundRect(7.5,8,9,7,1);ctx.stroke();ctx.beginPath();ctx.arc(12,11.5,2,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(9,8);ctx.lineTo(10,6.5);ctx.lineTo(13,6.5);ctx.lineTo(14,8);ctx.stroke()}
  if(kind===1){ctx.beginPath();ctx.moveTo(12,23);ctx.bezierCurveTo(10,18,5,14,5,9);ctx.arc(12,9,7,Math.PI,0);ctx.bezierCurveTo(19,14,14,18,12,23);ctx.stroke();ctx.beginPath();ctx.arc(12,9,2.5,0,Math.PI*2);ctx.stroke()}
  if(kind===2){ctx.strokeRect(2,4,20,14);ctx.beginPath();ctx.moveTo(7,18);ctx.lineTo(5,22);ctx.lineTo(12,18);ctx.stroke();ctx.beginPath();ctx.moveTo(8,10);ctx.bezierCurveTo(8,6,12,8,12,10);ctx.bezierCurveTo(12,8,16,6,16,10);ctx.bezierCurveTo(16,13,12,15,12,15);ctx.bezierCurveTo(12,15,8,13,8,10);ctx.stroke()}
  if(kind===3){ctx.beginPath();ctx.moveTo(1,11);ctx.lineTo(23,2);ctx.lineTo(16,22);ctx.lineTo(11,14);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(11,14);ctx.lineTo(23,2);ctx.stroke()}
  ctx.restore();
 }
 function drawWorldMap(x:number,y:number,w:number,h:number){
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=colors.accent;ctx.globalAlpha=.17;
  if(world)for(const feature of world.features){if(!feature.geometry)continue;const groups=feature.geometry.type==="Polygon"?[feature.geometry.coordinates as number[][][]]:feature.geometry.coordinates as number[][][][];for(const polygon of groups){for(const ring of polygon){ctx.beginPath();ring.forEach(([lng,lat],index)=>{const px=x+(lng+180)/360*w,py=y+(90-lat)/180*h;(index?ctx.lineTo(px,py):ctx.moveTo(px,py))});ctx.fill()}}}
  else{for(const [cx,cy,rx,ry] of [[.18,.46,.15,.26],[.38,.35,.09,.18],[.52,.48,.12,.28],[.69,.37,.19,.22],[.82,.69,.1,.12]]){ctx.beginPath();ctx.ellipse(x+w*cx,y+h*cy,w*rx,h*ry,0,0,Math.PI*2);ctx.fill()}}
  ctx.globalAlpha=1;ctx.strokeStyle=colors.ink;ctx.lineWidth=1.5;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(x+w*.43,y+h*.70);ctx.bezierCurveTo(x+w*.55,y+h*.70,x+w*.69,y+h*.40,x+w*.88,y+h*.22);ctx.stroke();ctx.setLineDash([]);
  const markerSize=h<100?9:14,markers:Array<[number,number,"home"|"plane"|"heart"]>=[[.12,.38,"home"],[.28,.59,"plane"],[.43,.70,"heart"],[.55,.25,"home"],[.75,.47,"home"],[.88,.22,"plane"]];
  for(const [px,py,symbol] of markers){const mx=x+w*px,my=y+h*py,r=markerSize;ctx.fillStyle=colors.ink;ctx.beginPath();ctx.arc(mx,my-r*.3,r*.68,Math.PI,0);ctx.bezierCurveTo(mx+r*.68,my+r*.28,mx,my+r,mx,my+r);ctx.bezierCurveTo(mx,my+r,mx-r*.68,my+r*.28,mx-r*.68,my-r*.3);ctx.fill();ctx.strokeStyle=colors.paper;ctx.fillStyle=colors.paper;ctx.lineWidth=1.25;ctx.beginPath();if(symbol==="home"){ctx.moveTo(mx-r*.34,my-r*.28);ctx.lineTo(mx,my-r*.56);ctx.lineTo(mx+r*.34,my-r*.28);ctx.moveTo(mx-r*.25,my-r*.27);ctx.lineTo(mx-r*.25,my+r*.18);ctx.lineTo(mx+r*.25,my+r*.18);ctx.lineTo(mx+r*.25,my-r*.27)}else if(symbol==="plane"){ctx.moveTo(mx-r*.42,my-r*.08);ctx.lineTo(mx+r*.42,my-r*.08);ctx.moveTo(mx,my-r*.48);ctx.lineTo(mx,my+r*.32);ctx.moveTo(mx-r*.25,my+r*.18);ctx.lineTo(mx,my+r*.02);ctx.lineTo(mx+r*.25,my+r*.18)}else{ctx.moveTo(mx,my+r*.25);ctx.bezierCurveTo(mx-r*.55,my-r*.08,mx-r*.28,my-r*.5,mx,my-r*.18);ctx.bezierCurveTo(mx+r*.28,my-r*.5,mx+r*.55,my-r*.08,mx,my+r*.25)}ctx.stroke()}
  ctx.restore();
 }
 function drawCard(yOffset:number,cardHeight:number){
  ctx.save();ctx.translate(0,yOffset);const w=canvas.width,h=cardHeight,landscape=layout==="double";
  // Layout in normalized design units, preserving physical size and QR proportions.
  ctx.scale(w/850,w/850);const H=h/w*850;
  ctx.fillStyle=colors.paper;ctx.fillRect(0,0,850,H);ctx.strokeStyle=colors.accent;ctx.lineWidth=1.5;ctx.strokeRect(20,20,810,H-40);
  ctx.fillStyle=colors.ink;text(copy.name.toUpperCase(),425,landscape?36:H*.042,720,landscape?19:24,"Georgia","center",2);
  if(event.wedding_date){const date=new Date(`${event.wedding_date}T00:00:00Z`);if(!Number.isNaN(date.getTime())){ctx.fillStyle=colors.accent;text(new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"}).format(date),425,landscape?84:H*.10,700,landscape?13:18)}}
  ctx.fillStyle=colors.ink;text("ADD YOUR MARK",425,landscape?104:H*.149,740,landscape?44:69,"Georgia","center",1,"700");
  ctx.fillStyle=colors.accent;text(copy.secondary,425,landscape?153:H*.222,730,landscape?35:57,'"Segoe Script", "Brush Script MT", cursive',"center",1,"500");
  ctx.fillStyle=colors.ink;text(copy.supporting.toUpperCase(),425,landscape?203:H*.305,710,landscape?14:18,"Georgia","center",2,"600");
  const start=landscape?262:H*.41,step=landscape?46:H*.104;
  copy.instructions.forEach((instruction,index)=>{
   const y=start+index*step;ctx.fillStyle=colors.accent;ctx.beginPath();ctx.arc(67,y+14,landscape?13:18,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors.paper;text(String(index+1),67,y+(landscape?4:0),30,landscape?17:23);
   drawIcon(index,landscape?93:89,y+(landscape?2:2),landscape?26:35);
   ctx.fillStyle=colors.ink;text(instruction.title.toUpperCase(),landscape?124:135,y-1,landscape?275:270,landscape?16:21,"Georgia","left",1,"700");text(landscape?(["Open your camera and scan to get started.","Pin your origin or a place to visit.","Share a recommendation, advice, or note.",tier==="timeline-plus"?"Share a memory, or skip to explore.":"Explore the places everyone shared."][index]):instruction.text,landscape?124:135,y+(landscape?20:31),landscape?275:265,landscape?12:18,"Georgia","left",3);
  });
  ctx.strokeStyle=colors.accent;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(435,start-8);ctx.lineTo(435,landscape?456:H*.805);ctx.stroke();
  const mapX=landscape?486:474,mapY=landscape?244:H*.405,mapW=landscape?285:315,mapH=landscape?72:155;drawWorldMap(mapX,mapY,mapW,mapH);
  const q=landscape?120:225,qx=landscape?568:519,qy=landscape?325:H*.555;
  ctx.fillStyle="#ffffff";ctx.strokeStyle=colors.ink;ctx.lineWidth=landscape?4:7;ctx.fillRect(qx-8,qy-8,q+16,q+16);ctx.strokeRect(qx-8,qy-8,q+16,q+16);ctx.imageSmoothingEnabled=false;ctx.drawImage(qr,qx,qy,q,q);ctx.imageSmoothingEnabled=true;
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
