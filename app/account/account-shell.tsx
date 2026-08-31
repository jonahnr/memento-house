"use client";
import type {ReactNode} from "react";
import {getSupabaseBrowserClient} from "../../lib/supabase";

export function AccountShell({email,mapEnabled=false,children}:{email?:string;mapEnabled?:boolean;children:ReactNode}){
 async function signOut(){await getSupabaseBrowserClient()?.auth.signOut();location.href="/"}
 const isAdmin=email?.trim().toLowerCase()==="jonahnr@gmail.com";
 return <main className="accountShell">
  <header className="accountShellHeader"><a href="/" className="houseBrand"><img src="/brand/memento-house-logo.webp" alt="Memento House"/><div>Memento House<small>Your private account</small></div></a><div><span>{email||"Customer account"}</span>{isAdmin&&<a className="button light" href="/admin/orders">Switch to admin view</a>}<button type="button" className="button light" onClick={signOut}>Log out</button></div></header>
  <nav className="accountShellNav" aria-label="Customer account"><a href="#overview">Overview</a><a href="#orders">My orders</a><a href="#digital">My digital experiences</a><a href="#proofs">Proofs & approvals</a><a href="#profile">Profile & security</a>{mapEnabled&&<details className="accountExperienceMenu"><summary>Memento Map</summary><a href="/dashboard">Open dashboard →</a></details>}</nav>
  <div className="accountShellBody">{children}</div>
 </main>
}
