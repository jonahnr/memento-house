"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import type {User} from "@supabase/supabase-js";
import {getSupabaseBrowserClient} from "../../lib/supabase";

export function AuthGate({children}:{children:React.ReactNode}){
 const router=useRouter(),[user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{const client=getSupabaseBrowserClient();if(!client){router.replace("/login");return}client.auth.getSession().then(({data})=>{if(!data.session)router.replace("/login");else setUser(data.session.user);setLoading(false)});const{data}=client.auth.onAuthStateChange((_event,session)=>{if(!session)router.replace("/login");else setUser(session.user)});return()=>data.subscription.unsubscribe()},[router]);
 async function signOut(){const client=getSupabaseBrowserClient();await client?.auth.signOut();router.replace("/login")}
 if(loading)return <main className="auth authLoading"><div><span className="eyebrow">Memento House</span><h1>Opening your keepsake…</h1></div></main>;
 if(!user)return null;
 return <><div className="accountBar"><span>{user.email}</span><button onClick={signOut}>Sign out</button></div>{children}</>;
}
