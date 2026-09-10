import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {MEMENTO_MAP_TYPE_IDS,MEMENTO_MAP_TYPES,typeFromRoute} from "../../../lib/memento-map-types";
import {MementoMapTypeLanding} from "../type-landing";
export function generateStaticParams(){return MEMENTO_MAP_TYPE_IDS.map(type=>({type:MEMENTO_MAP_TYPES[type].route}))}
export async function generateMetadata({params}:{params:Promise<{type:string}>}):Promise<Metadata>{const route=(await params).type,type=typeFromRoute(route);if(!type)return{};const config=MEMENTO_MAP_TYPES[type],titles={wedding:"Interactive Wedding Guest Map & Keepsake",family_reunion:"Interactive Family Reunion Map & Keepsake",celebration_of_life:"Interactive Memorial Memory Map",next_chapter:"Graduation, Retirement & Moving Memory Map",events_community:"Interactive Event & Community Map"};return{title:`${titles[type]} | Memento House`,description:config.marketingDescription,alternates:{canonical:`/memento-map/${route}`}}}
export default async function TypePage({params}:{params:Promise<{type:string}>}){const type=typeFromRoute((await params).type);if(!type)notFound();return <MementoMapTypeLanding type={type}/>}
