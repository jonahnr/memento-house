export type PreparedFileDelivery={appleMobile:boolean;android?:boolean;preview:Window|null};

export function isAppleMobileBrowser(userAgent:string,platform="",maxTouchPoints=0){
 return /iPad|iPhone|iPod/i.test(userAgent)||(platform==="MacIntel"&&maxTouchPoints>1);
}

export function prepareFileDelivery():PreparedFileDelivery{
 const appleMobile=isAppleMobileBrowser(navigator.userAgent,navigator.platform,navigator.maxTouchPoints);
 const android=/Android/i.test(navigator.userAgent);
 const preview=appleMobile||android?window.open("about:blank","_blank"):null;
 if(preview){
  preview.document.title="Preparing your Memento Map";
  const message=preview.document.createElement("p");
  message.textContent="Preparing your Memento Map export…";
  message.style.cssText="font:18px Georgia,serif;color:#554d43;padding:32px";
  preview.document.body.appendChild(message);
 }
 return {appleMobile,android,preview};
}

export function deliverBrowserFile(blob:Blob,filename:string,prepared:PreparedFileDelivery){
 const url=URL.createObjectURL(blob);
 if(prepared.android&&prepared.preview&&!prepared.preview.closed){
  const page=prepared.preview.document;
  page.title="Save your Memento Map";
  page.body.replaceChildren();
  const message=page.createElement("p");
  message.textContent="Your keepsake is ready. Tap Save keepsake below. For an image, you can also touch and hold the preview to save it. If this app blocks saving, open Memento Map in Chrome and try again.";
  const save=page.createElement("a");
  save.href=url;save.download=filename;save.textContent="Save keepsake";
  save.style.cssText="display:inline-block;padding:16px;background:#76592f;color:white;margin-bottom:20px";
  page.body.style.cssText="font:18px Georgia,serif;padding:24px;color:#554d43";
  page.body.append(message,save);
  if(blob.type.startsWith("image/")){
   const preview=page.createElement("img");preview.src=url;preview.alt="Your Memento Map keepsake";preview.style.cssText="display:block;max-width:100%;height:auto";page.body.append(preview);
  }
  // Keep this URL alive for the preview's lifetime so delayed saves still work.
  prepared.preview.addEventListener("pagehide",()=>URL.revokeObjectURL(url),{once:true});
  return "Your keepsake is ready in the save tab. Tap Save keepsake to download it.";
 }
 if(prepared.appleMobile){
  if(prepared.preview)prepared.preview.location.replace(url);
  else window.location.assign(url);
  window.setTimeout(()=>URL.revokeObjectURL(url),300000);
  return "Your export opened in Safari. Use Share, then Save to Files or Save Image.";
 }
 const link=document.createElement("a");
 link.download=filename;
 link.href=url;
 link.style.display="none";
 document.body.appendChild(link);
 link.click();
 link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),60000);
 return "Your download has started. Check your browser’s Downloads folder.";
}
