"use client";
import {useEffect,useState} from "react";
import {getSupabaseBrowserClient} from "../../../lib/supabase";
import {canonicalAuthOrigin} from "../../../lib/oauth-origin";

export default function AuthCallback(){
 const[message,setMessage]=useState("Finishing your secure sign-in…");
 useEffect(()=>{void(async()=>{
  const canonical=canonicalAuthOrigin();
  if(canonical&&location.origin!==canonical){location.replace(`${canonical}${location.pathname}${location.search}`);return}
  const client=getSupabaseBrowserClient(),url=new URL(location.href),code=url.searchParams.get("code"),next=url.searchParams.get("next")||"/account",authError=url.searchParams.get("error_description")||new URLSearchParams(location.hash.slice(1)).get("error_description");
  if(authError){setMessage(`Your email or sign-in link could not be completed: ${authError}. Request a new link and open only the newest message.`);return}
  if(!client){setMessage("The account service is not configured. Return to login and try again.");return}
  if(code){const result=await client.auth.exchangeCodeForSession(code);if(result.error){const existing=await client.auth.getSession();if(!existing.data.session){setMessage(`This confirmation link could not be completed: ${result.error.message}. Return to signup and request a new confirmation email.`);return}}}
  const session=await client.auth.getSession();
  if(!session.data.session){setMessage("This confirmation link is expired, was already used, or opened without its sign-in information. Return to signup and request a new confirmation email.");return}
  location.replace(next.startsWith("/")?next:"/account");
 })()},[]);
 return <main className="auth authLoading"><div><span className="eyebrow">Memento House</span><h1>{message}</h1><p><a className="textLink" href="/login">Return to login</a></p></div></main>
}
