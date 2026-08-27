"use client";
import {useEffect,useState} from "react";
import {getSupabaseBrowserClient} from "../../../lib/supabase";

export default function AuthCallback(){
 const[message,setMessage]=useState("Finishing your secure sign-in…");
 useEffect(()=>{void(async()=>{
  const client=getSupabaseBrowserClient(),url=new URL(location.href),code=url.searchParams.get("code"),next=url.searchParams.get("next")||"/dashboard",oauthError=url.searchParams.get("error_description");
  if(oauthError){setMessage(oauthError);return}
  if(!client||!code){setMessage("The sign-in link is incomplete or expired. Return to login and try again.");return}
  const result=await client.auth.exchangeCodeForSession(code);
  if(result.error){setMessage(`${result.error.message} Return to login and try again.`);return}
  location.replace(next.startsWith("/")?next:"/dashboard");
 })()},[]);
 return <main className="auth authLoading"><div><span className="eyebrow">Memento House</span><h1>{message}</h1><p><a className="textLink" href="/login">Return to login</a></p></div></main>
}
