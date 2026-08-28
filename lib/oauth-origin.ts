const VERCEL_CANONICAL_ORIGIN="https://memento-house.vercel.app";

export function canonicalAuthOrigin(){
 if(typeof window==="undefined")return "";
 const host=window.location.hostname;
 if(host.endsWith(".vercel.app")&&host!=="memento-house.vercel.app")return VERCEL_CANONICAL_ORIGIN;
 return window.location.origin;
}

export function moveToCanonicalAuth(path:string){
 const origin=canonicalAuthOrigin();
 if(origin&&origin!==window.location.origin){window.location.assign(`${origin}${path}`);return true}
 return false;
}
