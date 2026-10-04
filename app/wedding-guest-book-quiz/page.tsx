import {marketingMetadata} from "../../lib/marketing-seo";
import {MarketingShell,Breadcrumbs} from "../marketing/components";
import {GuestbookQuiz} from "../marketing/interactive-tools";
export const metadata=marketingMetadata("Which Wedding Guest Book Is Right for You? | Memento House","Answer six questions to find a guestbook format that fits your memories, guest participation, and life after the wedding.","/wedding-guest-book-quiz");
export default function Quiz(){return <MarketingShell><Breadcrumbs items={[{name:"Home",href:"/"},{name:"Ideas",href:"/ideas"},{name:"Guestbook quiz",href:"/wedding-guest-book-quiz"}]}/><header className="editorialHero compactHero"><div className="eyebrow">Your people. Your kind of keepsake.</div><h1>Which Wedding Guest Book Is Right for You?</h1><p>Six questions. No email required. Traditional books, physical signature keepsakes, audio and photo formats, and Memento Map can all be good matches.</p></header><GuestbookQuiz/></MarketingShell>}
