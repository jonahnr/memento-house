import {createHmac,timingSafeEqual} from "node:crypto";

type ConfirmationWatch={userId:string;expiresAt:number};

function encode(value:string){return Buffer.from(value).toString("base64url")}
function signature(payload:string,secret:string){return createHmac("sha256",secret).update(payload).digest("base64url")}

export function createConfirmationWatch(userId:string,secret:string){
 const payload=encode(JSON.stringify({userId,expiresAt:Date.now()+30*60_000} satisfies ConfirmationWatch));
 return `${payload}.${signature(payload,secret)}`;
}

export function readConfirmationWatch(token:string,secret:string):ConfirmationWatch|null{
 const[payload,provided]=token.split(".");if(!payload||!provided)return null;
 const expected=signature(payload,secret),left=Buffer.from(provided),right=Buffer.from(expected);if(left.length!==right.length||!timingSafeEqual(left,right))return null;
 try{const value=JSON.parse(Buffer.from(payload,"base64url").toString()) as ConfirmationWatch;return value.userId&&value.expiresAt>Date.now()?value:null}catch{return null}
}
