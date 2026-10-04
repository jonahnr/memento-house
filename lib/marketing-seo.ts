import type {Metadata} from "next";
export const MARKETING_SITE="https://mementohouse.com";
export function marketingMetadata(title:string,description:string,path:string,image="/brand/map-wedding-map.webp",imageAlt="Memento Map wedding experience"):Metadata{return {title:{absolute:title},description,alternates:{canonical:path},openGraph:{title,description,url:path,type:"website",siteName:"Memento House",images:[{url:image,alt:imageAlt}]},twitter:{card:"summary_large_image",title,description,images:[image]}}}
export function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,"\\u003c")}
export function breadcrumbSchema(items:{name:string;href:string}[]){return {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:items.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.name,item:MARKETING_SITE+item.href}))}}
