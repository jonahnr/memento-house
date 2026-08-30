import QRCode from "qrcode";
export const runtime="nodejs";
export async function GET(request:Request){const url=new URL(request.url).searchParams.get("url")||"";if(!url.startsWith("https://www.mementohouse.com/"))return new Response("Invalid URL",{status:400});const image=await QRCode.toBuffer(url,{width:360,margin:2,errorCorrectionLevel:"H",color:{dark:"#282621",light:"#fffdf8"}});return new Response(new Uint8Array(image),{headers:{"content-type":"image/png","cache-control":"private, max-age=3600"}})}
