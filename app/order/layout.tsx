import {Suspense} from "react";

export default function OrderLayout({children}:{children:React.ReactNode}){
  return <Suspense fallback={<main className="orderPage"><p>Preparing your order…</p></main>}>{children}</Suspense>;
}
