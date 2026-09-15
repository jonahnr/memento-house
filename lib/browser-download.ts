export type PreparedFileDelivery={appleMobile:boolean;preview:Window|null};

export function isAppleMobileBrowser(userAgent:string,platform="",maxTouchPoints=0){
 return /iPad|iPhone|iPod/i.test(userAgent)||(platform==="MacIntel"&&maxTouchPoints>1);
}

export function prepareFileDelivery():PreparedFileDelivery{
 const appleMobile=isAppleMobileBrowser(navigator.userAgent,navigator.platform,navigator.maxTouchPoints);
 const preview=appleMobile?window.open("about:blank","_blank"):null;
 if(preview){
  preview.document.title="Preparing your Memento Map";
  const message=preview.document.createElement("p");
  message.textContent="Preparing your Memento Map export…";
  message.style.cssText="font:18px Georgia,serif;color:#554d43;padding:32px";
  preview.document.body.appendChild(message);
 }
 return {appleMobile,preview};
}

export function deliverBrowserFile(blob:Blob,filename:string,prepared:PreparedFileDelivery){
 const url=URL.createObjectURL(blob);
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
 return "Your export has downloaded.";
}
