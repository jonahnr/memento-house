"use client";
import {useEffect,useRef,useState} from "react";
import {mapExperienceLabels} from "../../../lib/memento-map-types";
import {eventQrUrl} from "../../../lib/map-presentation";
import {qrLayouts,qrDesigns,qrSignCopy,renderQrSign,type QrLayout,type QrDesign,type SignEvent} from "../../../lib/qr-sign";
import {pngWithDpi} from "../../../lib/png-density";
import {pdfFromCanvas} from "../../../lib/canvas-pdf";
import {prepareFileDelivery,deliverBrowserFile} from "../../../lib/browser-download";

export function QR({wedding,mapUrl,tier}:{wedding:SignEvent;mapUrl:string;tier:string}){
 const [layout,setLayout]=useState<QrLayout>("single"),[design,setDesign]=useState<QrDesign>("classic"),[preview,setPreview]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[exporting,setExporting]=useState(false),[ready,setReady]=useState(false),canvas=useRef<HTMLCanvasElement|null>(null);
 const labels=mapExperienceLabels(wedding.map_type,wedding.map_subtype),size=qrLayouts[layout],copy=qrSignCopy(wedding,tier),qrUrl=eventQrUrl(mapUrl);
 useEffect(()=>{let active=true;setReady(false);setError("");canvas.current=null;void renderQrSign(wedding,mapUrl,tier,layout,design).then(result=>{if(active){canvas.current=result;setPreview(result.toDataURL("image/png"));setReady(true)}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"The sign could not be prepared.")});return()=>{active=false}},[wedding.partner_one_name,wedding.partner_two_name,wedding.title,wedding.wedding_date,wedding.map_type,wedding.map_subtype,mapUrl,tier,layout,design]);
 async function download(format:"png"|"pdf"){
  if(!canvas.current||!ready||exporting)return;const delivery=prepareFileDelivery();setExporting(true);setError("");setNotice("");
  try{const blob=format==="pdf"?pdfFromCanvas(canvas.current,size.width,size.height):await new Promise<Blob>((resolve,reject)=>canvas.current!.toBlob(value=>value?resolve(value):reject(new Error("The PNG could not be prepared.")),"image/png"));setNotice(deliverBrowserFile(format==="png"?await pngWithDpi(blob):blob,`memento-map-event-sign-${layout}.${format}`,delivery))}catch(reason){delivery.preview?.close();setError((reason as Error).message)}finally{setExporting(false)}
 }
 return <div className="eventSignLayout">
  <style>{`@media print{@page{size:${size.width}in ${size.height}in;margin:0}.eventSignPrint{width:${size.width}in!important;height:${size.height}in!important}}`}</style>
  <div className="eventSignPreview"><div className="eventSignPrint">{preview&&<img src={preview} alt={`${copy.name} event sign. ADD YOUR MARK ${copy.secondary}. ${copy.instructions.map(step=>step.title).join(". ")}. START HERE. Scan to add your mark. Memento House.`}/>}</div>{!ready&&<p role="status">Preparing your event sign…</p>}<p className="eventSignDimensions">{size.width} × {size.height} inches · 300 PPI</p></div>
  <section className="qrTools"><div className="eyebrow">Ready for your gathering</div><h2>{labels.qrTitle}</h2><p>Your personalized sign guides people from their first place to the contributions included in your package.</p>
   <label>Print layout<select value={layout} onChange={event=>setLayout(event.target.value as QrLayout)}>{Object.entries(qrLayouts).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
   <label>Sign design<select value={design} onChange={event=>setDesign(event.target.value as QrDesign)}>{Object.entries(qrDesigns).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></label>
   <div className="buttonRow"><button className="button gold" disabled={!ready||exporting} onClick={()=>void download("pdf")}>Download print-ready PDF</button><button className="button light" disabled={!ready||exporting} onClick={()=>void download("png")}>Download 300 PPI PNG</button><button className="button light" disabled={!ready} onClick={()=>window.print()}>Print sign</button></div>
   <p className="qrPrintQuality">The PDF has the exact selected page size. Print at actual size (100%), with headers and footers off. Use borderless printing or larger paper and trim if your printer requires margins.</p>
   <label>Event QR link<input readOnly value={qrUrl}/></label><p>Scanning starts the place contribution. {tier==="timeline-plus"?"After adding a place, Next opens the separate memory step.":"After adding a place, Next returns to the map."}</p>
   <a className="button light" href={qrUrl} target="_blank" rel="noreferrer">Try the guest QR experience ↗</a><a className="textLink" href={mapUrl}>{labels.openMap} ↗</a>
   {notice&&<p role="status">{notice}</p>}{error&&<p className="authError" role="alert">{error}</p>}
  </section>
 </div>;
}
