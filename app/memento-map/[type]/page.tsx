import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {MEMENTO_MAP_TYPE_IDS,MEMENTO_MAP_TYPES,typeFromRoute} from "../../../lib/memento-map-types";
import {MementoMapTypeLanding} from "../type-landing";
export function generateStaticParams(){return MEMENTO_MAP_TYPE_IDS.map(type=>({type:MEMENTO_MAP_TYPES[type].route}))}
export async function generateMetadata({params}:{params:Promise<{type:string}>}):Promise<Metadata>{const route=(await params).type,type=typeFromRoute(route);if(!type)return{};const config=MEMENTO_MAP_TYPES[type];return{title:config.seo.title,description:config.seo.description,keywords:config.seo.keywords,alternates:{canonical:`/memento-map/${route}`}}}
export default async function TypePage({params}:{params:Promise<{type:string}>}){const type=typeFromRoute((await params).type);if(!type)notFound();return <MementoMapTypeLanding type={type}/>}
