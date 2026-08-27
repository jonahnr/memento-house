import {Suspense} from "react";

export default function QuestionnaireLayout({children}:{children:React.ReactNode}){
  return <Suspense fallback={<main className="questionnairePage"><p>Loading your questionnaire…</p></main>}>{children}</Suspense>;
}
