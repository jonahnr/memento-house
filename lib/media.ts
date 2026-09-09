import type {MapTier} from "./map-entitlement";

export type MediaAsset={id:string;media_type:"photo"|"video";status:"reserved"|"uploading"|"processing"|"ready"|"failed"|"expired"|"deleted";public_url?:string|null;playback_url?:string|null;thumbnail_url?:string|null;cloudflare_uid?:string|null;alt_text?:string|null;duration_seconds?:number|null;timeline_entry_id?:string|null;story_location_id?:string|null;destination_id?:string|null;error_message?:string|null};
export type VideoUsage={usedSeconds:number;reservedSeconds:number;remainingSeconds:number;videoCount:number;maxSeconds:number;maxVideos:number;maxIndividualSeconds:number;maxFileBytes:number};

const base={maxSeconds:600,maxVideos:20,maxIndividualSeconds:60,maxFileBytes:500_000_000};
const limitsByTier:Record<MapTier,typeof base>={map:base,plus:base,"timeline-plus":base};
export function videoLimits(tier:MapTier){return limitsByTier[tier]}
export function formatVideoTime(seconds:number){const safe=Math.max(0,Math.floor(seconds));return `${Math.floor(safe/60)}:${String(safe%60).padStart(2,"0")}`}

export function summarizeVideoUsage(rows:Array<{status:string;duration_seconds?:number|null;reserved_seconds?:number|null}>,tier:MapTier):VideoUsage{
 const limits=videoLimits(tier),usedSeconds=Math.ceil(rows.filter(row=>row.status==="ready").reduce((sum,row)=>sum+Number(row.duration_seconds||0),0)),reservedSeconds=rows.filter(row=>["reserved","uploading","processing"].includes(row.status)).reduce((sum,row)=>sum+Number(row.reserved_seconds||0),0),videoCount=rows.filter(row=>["reserved","uploading","processing","ready"].includes(row.status)).length;
 return{usedSeconds,reservedSeconds,remainingSeconds:Math.max(0,limits.maxSeconds-usedSeconds-reservedSeconds),videoCount,maxSeconds:limits.maxSeconds,maxVideos:limits.maxVideos,maxIndividualSeconds:limits.maxIndividualSeconds,maxFileBytes:limits.maxFileBytes};
}
