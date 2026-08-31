import QRCode from "qrcode";
export const runtime="nodejs";
const allowedHosts=new Set(["mementohouse.com","www.mementohouse.com"]);
export async function GET(request:Request){const value=new URL(request.url).searchParams.get("url")||"";let target:URL;try{target=new URL(value)}catch{return new Response("Invalid URL",{status:400})}if(target.protocol!=="https:"||!allowedHosts.has(target.hostname)||!target.pathname.startsWith("/map/"))return new Response("Invalid URL",{status:400});const image=await QRCode.toBuffer(target.toString(),{width:360,margin:2,errorCorrectionLevel:"H",color:{dark:"#282621",light:"#fffdf8"}});return new Response(new Uint8Array(image),{headers:{"content-type":"image/png","cache-control":"private, max-age=3600"}})}
