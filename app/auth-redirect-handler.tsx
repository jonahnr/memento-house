"use client";
import {useEffect} from "react";

export function AuthRedirectHandler(){
  useEffect(()=>{
    if(!window.location.hash)return;
    const params=new URLSearchParams(window.location.hash.slice(1));
    const type=params.get("type");
    if(type==="invite")window.location.replace(`/account/setup${window.location.hash}`);
    if(type==="recovery")window.location.replace(`/account/reset-password${window.location.hash}`);
  },[]);
  return null;
}
