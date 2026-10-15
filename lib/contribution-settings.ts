export type ContributionMode="open"|"scheduled"|"paused"|"closed";
export function contributionMode(status?:string|null,closesAt?:string|null):ContributionMode{return status==="paused"||status==="closed"?status:closesAt?"scheduled":"open"}
export function localClosingTime(value?:string|null){if(!value)return "";const date=new Date(value);if(Number.isNaN(date.getTime()))return "";const pad=(n:number)=>String(n).padStart(2,"0");return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`}
export function closingTimeForSave(mode:ContributionMode,value:string,original?:string|null,now=Date.now()){
 if(mode!=="scheduled")return null;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error("Choose a future closing date and time, or select Open to accept contributions.");
 const date=new Date(value);if(Number.isNaN(date.getTime())||localClosingTime(date.toISOString())!==value)throw new Error("Choose a valid closing time in your time zone.");
 const iso=original&&value===localClosingTime(original)?original:date.toISOString();
 if(new Date(iso).getTime()<=now)throw new Error("The scheduled closing time has passed. Select Open to reopen contributions, or choose a future closing time.");
 return iso;
}
