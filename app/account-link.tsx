"use client";
import {useEffect,useState} from "react";
import {getSupabaseBrowserClient} from "../lib/supabase";
export function AccountLink(){const[signedIn,setSignedIn]=useState(false);useEffect(()=>{const client=getSupabaseBrowserClient();if(!client)return;void client.auth.getSession().then(({data})=>setSignedIn(Boolean(data.session)));const{data}=client.auth.onAuthStateChange((_event,session)=>setSignedIn(Boolean(session)));return()=>data.subscription.unsubscribe()},[]);return <a href={signedIn?"/account":"/login"}>{signedIn?"My account":"Sign in"}</a>}
