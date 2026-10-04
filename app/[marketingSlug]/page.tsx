import {notFound} from "next/navigation";
import {landingPages,landingBySlug} from "../../lib/ideas-content";
import {marketingMetadata} from "../../lib/marketing-seo";
import {EditorialPage} from "../marketing/components";
export function generateStaticParams(){return landingPages().map(page=>({marketingSlug:page.slug}))}
export const dynamicParams=false;
export async function generateMetadata({params}:{params:Promise<{marketingSlug:string}>}){const content=landingBySlug((await params).marketingSlug);return content?marketingMetadata(content.seoTitle,content.seoDescription,`/${content.slug}`,content.heroImage,content.heroImageAlt):{}}
export default async function IntentPage({params}:{params:Promise<{marketingSlug:string}>}){const content=landingBySlug((await params).marketingSlug);if(!content)notFound();return <EditorialPage content={content} landing/>}
