import {Suspense} from "react";

export default function SignupLayout({children}:{children:React.ReactNode}){
  return <Suspense fallback={<main className="auth authLoading"><p>Loading account access…</p></main>}>{children}</Suspense>;
}
