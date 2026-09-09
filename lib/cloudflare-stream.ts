import {createHmac,timingSafeEqual} from "node:crypto";

const clean=(value:string|undefined)=>value?.trim()||"";
export function cloudflareStreamConfig(){return{accountId:clean(process.env.CLOUDFLARE_ACCOUNT_ID),apiToken:clean(process.env.CLOUDFLARE_STREAM_API_TOKEN),webhookSecret:clean(process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET)}}
const encoded=(value:string)=>Buffer.from(value).toString("base64");

export class CloudflareStreamError extends Error{readonly status:number;constructor(message:string,status:number){super(message);this.name="CloudflareStreamError";this.status=status}}

export async function createStreamTusUpload(input:{fileSize:number;maxDurationSeconds:number;expiry:string;creator:string;mediaId:string;fileName:string}){
 const{accountId,apiToken}=cloudflareStreamConfig();if(!accountId||!apiToken)throw new Error("Cloudflare Stream is not configured.");
 const metadata=[`name ${encoded(input.fileName)}`,`creator ${encoded(input.creator)}`,`mementoMediaId ${encoded(input.mediaId)}`,`maxDurationSeconds ${encoded(String(input.maxDurationSeconds))}`,`expiry ${encoded(input.expiry)}`].join(",");
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/stream?direct_user=true`,{method:"POST",headers:{Authorization:`Bearer ${apiToken}`,"Tus-Resumable":"1.0.0","Upload-Length":String(input.fileSize),"Upload-Metadata":metadata},signal:AbortSignal.timeout(12000)});
 if(!response.ok){const raw=await response.text(),payload=await Promise.resolve().then(()=>JSON.parse(raw)).catch(()=>null) as {errors?:Array<{code?:number;message?:string}>}|null,provider=payload?.errors?.map(error=>[error.code,error.message].filter(Boolean).join(": ")).filter(Boolean).join("; ")||raw.slice(0,300)||response.statusText;throw new CloudflareStreamError(`Cloudflare Stream upload authorization failed: ${provider}`,response.status)}
 const uploadUrl=response.headers.get("location"),uid=response.headers.get("stream-media-id")||uploadUrl?.split("/").filter(Boolean).pop();
 if(!uploadUrl||!uid)throw new Error("Cloudflare Stream omitted the upload location.");
 return{uploadUrl,uid};
}

export async function deleteStreamVideo(uid:string){const{accountId,apiToken}=cloudflareStreamConfig();if(!accountId||!apiToken)throw new Error("Cloudflare Stream is not configured.");const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/stream/${encodeURIComponent(uid)}`,{method:"DELETE",headers:{Authorization:`Bearer ${apiToken}`},signal:AbortSignal.timeout(12000)});if(!response.ok&&response.status!==404)throw new Error(`Cloudflare Stream deletion failed (${response.status}).`)}

export async function getStreamStorageUsage(){const{accountId,apiToken}=cloudflareStreamConfig();if(!accountId||!apiToken)return null;const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/stream/storage-usage`,{headers:{Authorization:`Bearer ${apiToken}`},next:{revalidate:300},signal:AbortSignal.timeout(8000)}),payload=await response.json().catch(()=>null) as {result?:{totalStorageMinutes?:number;totalStorageMinutesLimit?:number;videoCount?:number}}|null;if(!response.ok||!payload?.result)return null;return{usedMinutes:Number(payload.result.totalStorageMinutes||0),limitMinutes:Number(payload.result.totalStorageMinutesLimit||0),videoCount:Number(payload.result.videoCount||0)}}

export function verifyStreamWebhook(raw:string,header:string|null,now=Math.floor(Date.now()/1000)){
 const{webhookSecret}=cloudflareStreamConfig();if(!webhookSecret||!header)return false;const values=Object.fromEntries(header.split(",").map(part=>part.trim().split("=",2))),time=Number(values.time),received=values.sig1;if(!Number.isFinite(time)||Math.abs(now-time)>300||!received)return false;const expected=createHmac("sha256",webhookSecret).update(`${time}.${raw}`).digest("hex"),a=Buffer.from(expected,"hex"),b=Buffer.from(received,"hex");return a.length===b.length&&timingSafeEqual(a,b)
}
