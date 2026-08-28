export function canonicalAuthOrigin(){
 if(typeof window==="undefined")return "";
 return window.location.origin;
}

export function moveToCanonicalAuth(_path:string){return false}
