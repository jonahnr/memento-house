"use client";
import {useEffect,useState} from "react";
import {getSupabaseBrowserClient} from "../lib/supabase";
import {readCart} from "../lib/cart";

export function CartLink({label=false}:{label?:boolean}){
 const[userId,setUserId]=useState(""),[count,setCount]=useState(0);
 useEffect(()=>{const client=getSupabaseBrowserClient();if(!client)return;let active=true;const update=(id?:string)=>{if(active)setUserId(id||"")};void client.auth.getSession().then(({data})=>update(data.session?.user.id));const{data}=client.auth.onAuthStateChange((_event,session)=>update(session?.user.id));return()=>{active=false;data.subscription.unsubscribe()}},[]);
 useEffect(()=>{const update=()=>setCount(userId?readCart(userId).length:0);update();window.addEventListener("storage",update);window.addEventListener("memento-cart-change",update);return()=>{window.removeEventListener("storage",update);window.removeEventListener("memento-cart-change",update)}},[userId]);
 if(!userId)return null;
 return <a className="cartShortcut" href="/cart" aria-label={`Shopping cart, ${count} ${count===1?"item":"items"}`} title="Shopping cart"><img src="/brand/navigation/shopping-cart.webp" width={28} height={28} alt=""/>{label&&<span>Shopping cart</span>}{count>0&&<b className="cartCount">{count}</b>}</a>;
}
