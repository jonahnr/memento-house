export function requestOrigin(request:Request){
 const configured=process.env.NEXT_PUBLIC_SITE_URL||process.env.SITE_URL;
 if(configured)return configured.replace(/\/$/,"");
 const host=request.headers.get("x-forwarded-host")||request.headers.get("host");
 const protocol=request.headers.get("x-forwarded-proto")||new URL(request.url).protocol.replace(":","")||"https";
 return host?`${protocol}://${host}`:new URL(request.url).origin;
}

export function publicSiteUrl(){
 return (process.env.NEXT_PUBLIC_SITE_URL||"https://mementohouse.com").replace(/\/$/,"");
}
