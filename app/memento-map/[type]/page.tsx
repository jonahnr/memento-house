import {notFound,permanentRedirect} from "next/navigation";
import type {Metadata} from "next";
import {MEMENTO_MAP_TYPE_IDS,MEMENTO_MAP_TYPES,typeFromRoute,MAP_OCCASIONS,mapTypeConfig} from "../../../lib/memento-map-types";
import {MementoMapTypeLanding} from "../type-landing";
export function generateStaticParams(){return [...MEMENTO_MAP_TYPE_IDS.map(type=>({type:MEMENTO_MAP_TYPES[type].route})),{type:"anniversary"}]}
export async function generateMetadata({params}:{params:Promise<{type:string}>}):Promise<Metadata>{const route=(await params).type,type=typeFromRoute(route)||MAP_OCCASIONS[route]?.type;if(!type)return{};const config=mapTypeConfig(type,route);return{title:`${config.name} Memento Map | Memento House`,description:config.seo.description,keywords:config.seo.keywords,alternates:{canonical:MAP_OCCASIONS[route]?.type==="next_chapter"?"/memento-map/next-chapter":`/memento-map/${route}`}}}
export default async function TypePage({params}:{params:Promise<{type:string}>}){const route=(await params).type,occasion=MAP_OCCASIONS[route];if(occasion?.type==="next_chapter")permanentRedirect("/memento-map/next-chapter");const type=typeFromRoute(route)||occasion?.type;if(!type)notFound();return <MementoMapTypeLanding type={type} occasion={occasion?route:undefined}/>}
