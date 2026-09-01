"use client";
import {useEffect,useRef,useState} from "react";

type TimelinePoint={id:string;title:string;location:string;latitude:number;longitude:number};
const rasterStyle:any={version:8,sources:{osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,maxzoom:19,attribution:"© OpenStreetMap contributors"}},layers:[{id:"osm",type:"raster",source:"osm",paint:{"raster-saturation":-.45,"raster-brightness-min":.18,"raster-brightness-max":.98,"raster-contrast":-.04}}]};

export function TimelinePlaybackMap({points}:{points:TimelinePoint[]}){
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),markers=useRef<any[]>([]),[ready,setReady]=useState(false);
 useEffect(()=>{let cancelled=false;(async()=>{if(!container.current||mapRef.current)return;const maplibre=await import("maplibre-gl");if(cancelled||!container.current)return;const map=new maplibre.Map({container:container.current,style:rasterStyle,center:[-84.5,39.1],zoom:4,renderWorldCopies:false,attributionControl:false});map.addControl(new maplibre.AttributionControl({compact:true}),"bottom-right");map.on("load",()=>{setReady(true);map.resize()});mapRef.current=map})();return()=>{cancelled=true;markers.current.forEach(marker=>marker.remove());mapRef.current?.remove();mapRef.current=null}},[]);
 useEffect(()=>{let cancelled=false;(async()=>{const map=mapRef.current;if(!map||!ready||!points.length)return;const maplibre=await import("maplibre-gl");if(cancelled)return;markers.current.forEach(marker=>marker.remove());markers.current=[];const bounds=new maplibre.LngLatBounds();points.forEach((point,index)=>{bounds.extend([point.longitude,point.latitude]);const el=document.createElement("span");el.className=`timelineRouteMarker${index===points.length-1?" current":""}`;el.textContent=String(index+1);el.title=`${point.title}: ${point.location}`;markers.current.push(new maplibre.Marker({element:el,anchor:"center"}).setLngLat([point.longitude,point.latitude]).addTo(map))});map.resize();if(points.length===1)map.flyTo({center:[points[0].longitude,points[0].latitude],zoom:6,duration:1200,essential:true});else map.fitBounds(bounds,{padding:65,maxZoom:6,duration:1400})})();return()=>{cancelled=true}},[points,ready]);
 return <div ref={container} className="timelinePlaybackMap" aria-label="Chronological route traveled in this story"/>;
}
