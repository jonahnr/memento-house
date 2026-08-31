"use client";
import {useEffect,useState} from "react";
import type {Session} from "@supabase/supabase-js";
import {getSupabaseBrowserClient} from "../lib/supabase";

type AccountState={signedIn:boolean;hasMap:boolean};
type AccountAccess={mapAccessOverride?:string;orders?:{product?:string;entitlement_status?:string}[]};
const mapProducts=new Set(["map","memento-map"]);

export function AccountLink(){
 const[state,setState]=useState<AccountState>({signedIn:false,hasMap:false});
 useEffect(()=>{
  const client=getSupabaseBrowserClient();if(!client)return;
  let active=true;
  async function update(session:Session|null){
   if(!active)return;
   if(!session){setState({signedIn:false,hasMap:false});return}
   setState(current=>({...current,signedIn:true}));
   try{
    const response=await fetch("/api/account/orders",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"}),data=await response.json() as AccountAccess,override=String(data.mapAccessOverride||"automatic"),forced=String(session.user.user_metadata?.map_tier||"");
    const hasOrder=(data.orders||[]).some(order=>mapProducts.has(String(order.product))&&order.entitlement_status==="active");
    if(active)setState({signedIn:true,hasMap:override!=="off"&&(hasOrder||["map","plus","timeline-plus"].includes(forced))});
   }catch{if(active)setState({signedIn:true,hasMap:false})}
  }
  void client.auth.getSession().then(({data})=>update(data.session));
  const{data}=client.auth.onAuthStateChange((_event,session)=>void update(session));
  return()=>{active=false;data.subscription.unsubscribe()};
 },[]);
 if(!state.signedIn)return <a href="/login">Sign in</a>;
 return <details className="globalAccountMenu"><summary>My account</summary><div><a href="/account">Account overview</a>{state.hasMap&&<a href="/dashboard">Open Memento Map</a>}</div></details>;
}
