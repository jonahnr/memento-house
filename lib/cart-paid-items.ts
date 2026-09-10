import {resolveCatalog} from "./product-catalog.ts";
import {parseMementoMapType,type MementoMapType} from "./memento-map-types";
export type PaidCartItem={id:string;product:string;tier:string;mapType?:MementoMapType;addon:string;customizationId:string;amount:number};
export function paidCartItems(metadata:Record<string,string>,lines:{amount_total:number;quantity:number;currency:string;price?:{product?:{metadata?:{cart_item_id?:string}}}}[],currency:string,total:number):PaidCartItem[]{
 const count=Number(metadata.cart_count);if(!Number.isInteger(count)||count<1||count>12||lines.length!==count)throw new Error("Invalid paid cart size.");
 const used=new Set<string>();
 const items=Array.from({length:count},(_,index)=>{
  const item=JSON.parse(metadata[`cart_item_${index}`]);
  if(typeof item.id!=="string"||used.has(item.id))throw new Error("Invalid paid cart identity.");used.add(item.id);
  resolveCatalog(item.product,item.tier,item.addon==="none"?[]:[item.addon]);if(item.product==="map"&&!parseMementoMapType(item.mapType))throw new Error("Invalid paid map type.");
  const matches=lines.filter(line=>line.price?.product?.metadata?.cart_item_id===item.id),line=matches[0];
  if(matches.length!==1||line.quantity!==1||line.currency!==currency||!Number.isSafeInteger(line.amount_total)||line.amount_total<0)throw new Error("Paid item could not be matched to its design.");
  return{...item,amount:line.amount_total} as PaidCartItem;
 });
 if(items.reduce((sum,item)=>sum+item.amount,0)!==total)throw new Error("Paid cart amounts do not match the checkout total.");
 return items;
}
