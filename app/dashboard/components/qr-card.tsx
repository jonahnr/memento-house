"use client";
import {useEffect,useState} from "react";
import QRCode from "qrcode";

export function QR({wedding,mapUrl,tier}:{wedding:{partner_one_name:string;partner_two_name:string;title:string};mapUrl:string;tier:string}){
 const names=`${wedding.partner_one_name} & ${wedding.partner_two_name}`;
 const[qr,setQr]=useState(""),[error,setError]=useState(""),[copied,setCopied]=useState(false),[layout,setLayout]=useState("single");
 useEffect(()=>{let active=true;setQr("");setError("");(async()=>{
  const canvas=document.createElement("canvas");
  await QRCode.toCanvas(canvas,mapUrl,{width:960,margin:4,errorCorrectionLevel:"H",color:{dark:"#282621",light:"#ffffff"}});
  if(active)setQr(canvas.toDataURL("image/png"));
 })().catch(()=>{if(active)setError("The QR code could not load. Please refresh and try again.")});return()=>{active=false}},[mapUrl]);
 const card=(copy:number)=><div className="qrCard" key={copy}><div className="eyebrow qrNames">{names}</div><img className="qrBrandLogo" src="/brand/memento-house-logo.webp" alt="Memento House"/><h2>Help Build<br/><i>{wedding.title||"Our Adventure Map"}</i></h2><div className="qrDivider" aria-hidden="true"><span/></div><p className="qrInvitation">{tier==="timeline-plus"?"Scan to share where you came from, recommend a place for us to visit, or add a memory to our story.":"Scan to share where you came from or recommend a place for us to visit."}</p><div className="qrCodeFrame">{qr?<img className="realQr" src={qr} alt={`Scannable QR code for ${names}'s map`}/>:<p role="status">{error||"Generating QR code…"}</p>}</div><b className="qrAddress">{mapUrl.replace(/^https?:\/\//,"")}</b><div className="qrDivider qrFooterDivider" aria-hidden="true"><span/></div><small>THANK YOU FOR BEING PART OF OUR STORY</small></div>;
 return <div className={`qrLayout qr-${layout}`}><div className="qrPrintSheet">{card(0)}{layout==="double"&&card(1)}</div><div className="qrTools"><h2>Your Wedding QR Code</h2><p>Choose a full-page sign for designated locations or two smaller landscape cards to cut apart and place on tables.</p><label>Print layout<select value={layout} onChange={e=>setLayout(e.target.value)}><option value="single">One full-page sign · 8.5 × 11 inches</option><option value="double">Two landscape cards · one 8.5 × 11 sheet</option></select></label><label>Guest map link<input value={mapUrl} readOnly/></label><a href={mapUrl} className="button gold">Open adventure map ↗</a><button className="button light" onClick={async()=>{try{await navigator.clipboard.writeText(mapUrl);setCopied(true)}catch{setError("Copy the guest map link from the field above.")}}}>{copied?"Link copied ✓":"Copy link"}</button><button className="button light" disabled={!qr} onClick={()=>window.print()}>Print {layout==="double"?"two cards":"full-page sign"} ↓</button>{error&&<p role="alert">{error}</p>}</div></div>;
}
