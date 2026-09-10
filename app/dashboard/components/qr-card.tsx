"use client";
import {mapExperienceLabels,mapTypeConfig,type MementoMapType} from "../../../lib/memento-map-types";
import {useEffect,useState} from "react";
import QRCode from "qrcode";

const layouts={single:{label:"One full-page sign · 8.5 × 11 inches",page:"8.5in 11in"},double:{label:"Two landscape cards · one 8.5 × 11 sheet",page:"8.5in 11in"},"4x6":{label:"Small sign · 4 × 6 inches",page:"4in 6in"},"5x7":{label:"Table sign · 5 × 7 inches",page:"5in 7in"}};
type Layout=keyof typeof layouts;
export function QR({wedding,mapUrl,tier}:{wedding:{partner_one_name:string;partner_two_name:string;title:string;map_type?:MementoMapType};mapUrl:string;tier:string}){
 const config=mapTypeConfig(wedding.map_type),labels=mapExperienceLabels(wedding.map_type),names=wedding.map_type&&wedding.map_type!=="wedding"?wedding.title:`${wedding.partner_one_name} & ${wedding.partner_two_name}`;
 const[qr,setQr]=useState(""),[error,setError]=useState(""),[copied,setCopied]=useState(false),[layout,setLayout]=useState<Layout>("single"),[design,setDesign]=useState("classic"),[logoReady,setLogoReady]=useState(false);
 useEffect(()=>{let active=true;setQr("");setError("");(async()=>{
  const canvas=document.createElement("canvas");
  await QRCode.toCanvas(canvas,mapUrl,{width:960,margin:4,errorCorrectionLevel:"H",color:{dark:"#282621",light:"#ffffff"}});
  if(active)setQr(canvas.toDataURL("image/png"));
 })().catch(()=>{if(active)setError("The QR code could not load. Please refresh and try again.")});return()=>{active=false}},[mapUrl]);
 const invitation=wedding.map_type&&wedding.map_type!=="wedding"?`Scan to contribute a place or memory. ${config.memoryPrompt}`:tier==="timeline-plus"?"Scan to share where you came from, recommend a place for us to visit, or add a memory to our story.":"Scan to share where you came from or recommend a place for us to visit.",footer=wedding.map_type&&wedding.map_type!=="wedding"?"THANK YOU FOR BEING PART OF THIS STORY":"THANK YOU FOR BEING PART OF OUR STORY";
 const card=(copy:number)=><div className="qrCard" key={copy}><div className="eyebrow qrNames">{names}</div><img className="qrBrandLogo" src="/brand/memento-house-logo-print.webp" alt="Memento House" onLoad={()=>setLogoReady(true)} onError={()=>{setLogoReady(false);setError("The logo could not load. Refresh before printing.")}}/><h2>Help Build<br/><i>{wedding.title||"Our Adventure Map"}</i></h2><div className="qrDivider" aria-hidden="true"><span/></div><p className="qrInvitation">{invitation}</p><div className="qrCodeFrame">{qr?<img className="realQr" src={qr} alt={`Scannable QR code for ${names}'s map`}/>:<p role="status">{error||"Generating QR code…"}</p>}</div><b className="qrAddress">{mapUrl.replace(/^https?:\/\//,"")}</b><div className="qrDivider qrFooterDivider" aria-hidden="true"><span/></div><small>{footer}</small></div>;
 return <div className={`qrLayout qr-${layout} qr-design-${design}`}>
  <style>{`@media print{@page{size:${layouts[layout].page};margin:.25in}}`}</style>
  <div className="qrPrintSheet">{card(0)}{layout==="double"&&card(1)}</div>
  <div className="qrTools"><h2>{labels.qrTitle}</h2><p>{labels.qrContext}</p>
   <label>Print layout<select value={layout} onChange={e=>setLayout(e.target.value as Layout)}>{Object.entries(layouts).map(([value,option])=><option key={value} value={value}>{option.label}</option>)}</select></label>
   <label>Sign design<select value={design} onChange={e=>setDesign(e.target.value)}><option value="classic">Classic Gold · original design</option><option value="garden">Garden Arch · soft sage</option><option value="editorial">Modern Editorial · ink & ivory</option></select></label>
   <p className="qrPrintQuality">Print-ready at 300+ PPI. Choose the matching paper size and 100% scale, with headers and footers off. You can also select “Save as PDF” in the print dialog.</p>
   <label>{labels.mapLinkLabel}<input value={mapUrl} readOnly/></label><a href={mapUrl} className="button gold">{labels.openMap} ↗</a><button className="button light" onClick={async()=>{try{await navigator.clipboard.writeText(mapUrl);setCopied(true)}catch{setError(`Copy the ${labels.mapLinkLabel.toLowerCase()} from the field above.`)}}}>{copied?"Link copied ✓":"Copy link"}</button><button className="button light" disabled={!qr||!logoReady} onClick={()=>window.print()}>Print {layout==="double"?"two cards":layout==="single"?"full-page sign":`${layout.replace("x"," × ")} sign`} ↓</button>{error&&<p role="alert">{error}</p>}
  </div>
 </div>;
}
