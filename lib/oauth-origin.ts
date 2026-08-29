export function canonicalAuthOrigin(){
 if(typeof window==="undefined")return "";
 const hostname=window.location.hostname.toLowerCase();
 if(hostname==="localhost"||hostname==="127.0.0.1"||hostname==="::1")return window.location.origin;
 return "https://mementohouse.com";
}

export function moveToCanonicalAuth(path:string){
 if(typeof window==="undefined")return false;
 const target=canonicalAuthOrigin();
 if(!target||window.location.origin===target)return false;
 window.location.replace(`${target}${path.startsWith("/")?path:`/${path}`}`);
 return true;
}
