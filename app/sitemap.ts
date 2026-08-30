import type {MetadataRoute} from "next";
import {CELEBRATIONS} from "../lib/celebrations";
export default function sitemap():MetadataRoute.Sitemap{const pages=["","/our-story","/memento-map","/memento-deck","/unity-tile-signature-board","/privacy","/terms","/refunds","/shipping","/contact",...CELEBRATIONS.map(item=>`/celebrations/${item.slug}`)];return pages.map(path=>({url:`https://mementohouse.com${path}`,lastModified:new Date(),changeFrequency:path?"monthly":"weekly",priority:path.startsWith("/celebrations/")?0.75:path?0.8:1}))}
