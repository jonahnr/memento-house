import {ADDONS,resolveCatalog} from "./product-catalog.ts";
import {parseMementoMapType,type MementoMapType} from "./memento-map-types.ts";
export type CartItem={id:string;product:string;tier:string;addon:string;customization:string;mapType?:MementoMapType};
export function validateCart(value:unknown):CartItem[]{
 if(!Array.isArray(value)||!value.length||value.length>12)throw new Error("Choose between 1 and 12 items for your cart.");
 const ids=new Set<string>();let maps=0;
 return value.map(raw=>{
  if(!raw||typeof raw!=="object")throw new Error("Invalid cart item.");
  const {id,product,tier,addon="none",customization="",mapType:rawMapType}=raw,mapType=product==="map"?parseMementoMapType(rawMapType):undefined;
  if(typeof id!=="string"||!/^[a-zA-Z0-9-]{1,64}$/.test(id)||ids.has(id))throw new Error("Invalid or duplicate cart item.");ids.add(id);
  if(typeof product!=="string"||typeof tier!=="string"||typeof addon!=="string"||typeof customization!=="string"||customization.length>250_000)throw new Error("Invalid item configuration.");
  resolveCatalog(product,tier,addon==="none"?[]:[addon]);
  if(product==="map"&&!mapType)throw new Error("Choose a Memento Map type before adding it to the cart.");if(product==="map"&&++maps>1)throw new Error("Choose one Memento Map plan per cart.");
  if(product==="unity"&&!customization)throw new Error("Complete and save your Unity Tile design first.");
  if(customization){let parsed;try{parsed=JSON.parse(customization)}catch{throw new Error("Your saved design could not be read.")}if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Invalid saved design.");}
  return{id,product,tier,addon,customization,mapType};
 });
}
export function cartPrice(item:CartItem){return resolveCatalog(item.product,item.tier).price+(item.addon==="none"?0:ADDONS[item.addon as keyof typeof ADDONS]?.price||0)}
export const cartKey=(userId:string)=>`memento-cart:v1:${userId}`;
export function readCart(userId:string):CartItem[]{try{const value=JSON.parse(localStorage.getItem(cartKey(userId))||"[]");return value.length?validateCart(value):[]}catch{return[]}}
export function saveCart(userId:string,items:CartItem[]){if(items.length)validateCart(items);localStorage.setItem(cartKey(userId),JSON.stringify(items));window.dispatchEvent(new Event("memento-cart-change"));}
