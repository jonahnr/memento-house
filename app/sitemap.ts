import type {MetadataRoute} from "next";
import {CELEBRATIONS} from "../lib/celebrations";
import {GUIDES} from "../lib/guides";
import {MEMENTO_MAP_TYPE_IDS,MEMENTO_MAP_TYPES} from "../lib/memento-map-types";
export default function sitemap():MetadataRoute.Sitemap{const pages=["","/our-story","/memento-map",...MEMENTO_MAP_TYPE_IDS.map(type=>`/memento-map/${MEMENTO_MAP_TYPES[type].route}`),"/memento-deck","/unity-tile-signature-board","/guides",...GUIDES.map(item=>`/guides/${item.slug}`),"/privacy","/terms","/refunds","/shipping","/contact",...CELEBRATIONS.map(item=>`/celebrations/${item.slug}`)];return pages.map(path=>({url:`https://mementohouse.com${path}`,lastModified:new Date(),changeFrequency:path?"monthly":"weekly",priority:path.startsWith("/celebrations/")||path.startsWith("/guides/")?0.75:path?0.8:1}))}
