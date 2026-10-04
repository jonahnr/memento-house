import {notFound,permanentRedirect} from "next/navigation";
import {IDEA_TOPICS} from "../../../../lib/ideas-content";
export function generateStaticParams(){return IDEA_TOPICS.map(topic=>({category:topic.slug}))}
export const dynamicParams=false;
export default async function Category({params}:{params:Promise<{category:string}>}){const{category}=await params;if(!IDEA_TOPICS.some(topic=>topic.slug===category))notFound();permanentRedirect(`/ideas/${category}`)}
