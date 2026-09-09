import {createHmac,timingSafeEqual} from "node:crypto";

const clean=(value:string|undefined)=>value?.trim()||"";
export function cloudflareStreamConfig(){return{accountId:clean(process.env.CLOUDFLARE_ACCOUNT_ID),apiToken:clean(process.env.CLOUDFLARE_STREAM_API_TOKEN),webhookSecret:clean(process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET)}}
const encoded=(value:string)=>Buffer.from(value).toString("base64");

export async function createStreamTusUpload(input:{fileSize:number;maxDurationSeconds:number;expiry:string;creator:string;mediaId:string;fileName:string}){
 const{accountId,apiToken}=cloudflareStreamConfig();if(!accountId||!apiToken)throw new Error("Cloudflare Stream is not configured.");
 const metadata=[`name ${encoded(input.fileName)}`,`creator ${encoded(input.creator)}`,`mementoMediaId ${encoded(input.mediaId)}`,`maxDurationSeconds ${encoded(String(input.maxDurationSeconds))}`,`expiry ${encoded(input.expiry)}`].join(",");
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/stream?direct_user=true`,{method:"POST",headers:{Authorization:`Bearer ${apiToken}`,"Tus-Resumable":"1.0.0","Upload-Length":String(input.fileSize),"Upload-Metadata":metadata},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error(`Cloudflare Stream upload authorization failed (${response.status}).`);
 const uploadUrl=response.headers.get("location"),uid=response.headers.get("stream-media-id")||uploadUrl?.split("/").filter(Boolean).pop();
 if(!uploadUrl||!uid)throw new Error("Cloudflare Stream omitted the upload location.");
 return{uploadUrl,uid};
}

export async function deleteStreamVideo(uid:string){const{accountId,apiToken}=cloudflareStreamConfig();if(!accountId||!apiToken)throw new Error("Cloudflare Stream is not configured.");const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/stream/${encodeURIComponent(uid)}`,{method:"DELETE",headers:{Authorization:`Bearer ${apiToken}`},signal:AbortSignal.timeout(12000)});if(!response.ok&&response.status!==404)throw new Error(`Cloudflare Stream deletion failed (${response.status}).`)}

export function verifyStreamWebhook(raw:string,header:string|null,now=Math.floor(Date.now()/1000)){
 const{webhookSecret}=cloudflareStreamConfig();if(!webhookSecret||!header)return false;const values=Object.fromEntries(header.split(",").map(part=>part.trim().split("=",2))),time=Number(values.time),received=values.sig1;if(!Number.isFinite(time)||Math.abs(now-time)>300||!received)return false;const expected=createHmac("sha256",webhookSecret).update(`${time}.${raw}`).digest("hex"),a=Buffer.from(expected,"hex"),b=Buffer.from(received,"hex");return a.length===b.length&&timingSafeEqual(a,b)
}
