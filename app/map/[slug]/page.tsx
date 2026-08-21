import {WeddingExperience} from "./wedding-experience";
export const metadata={title:"Wedding Adventure Map | Memento House",description:"Recommend a real place for the couple’s next adventure."};
export default function WeddingMap({params}:{params:{slug:string}}){return <WeddingExperience slug={params.slug}/>}
