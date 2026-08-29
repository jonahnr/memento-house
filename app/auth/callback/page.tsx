"use client";
import {useEffect,useState} from "react";
import {getSupabaseBrowserClient} from "../../../lib/supabase";
import {canonicalAuthOrigin} from "../../../lib/oauth-origin";

export default function AuthCallback(){
 const[message,setMessage]=useState("Finishing your secure sign-in…");
 useEffect(()=>{void(async()=>{
  const canonical=canonicalAuthOrigin();
  if(canonical&&location.origin!==canonical){location.replace(`${canonical}${location.pathname}${location.search}`);return}
  const client=getSupabaseBrowserClient(),url=new URL(location.href),code=url.searchParams.get("code"),next=url.searchParams.get("next")||"/dashboard",oauthError=url.searchParams.get("error_description");
  if(oauthError){setMessage(`Google sign-in could not be completed: ${oauthError}`);return}
  if(!client){setMessage("The account service is not configured. Return to login and try again.");return}
  if(!code){setMessage("Google did not return a secure authorization code. Return to login and start again.");return}
  const result=await client.auth.exchangeCodeForSession(code);
  if(result.error){setMessage(`Google sign-in could not be completed: ${result.error.message}. Return to login and try again.`);return}
  location.replace(next.startsWith("/")?next:"/dashboard");
 })()},[]);
 return <main className="auth authLoading"><div><span className="eyebrow">Memento House</span><h1>{message}</h1><p><a className="textLink" href="/login">Return to login</a></p></div></main>
}
