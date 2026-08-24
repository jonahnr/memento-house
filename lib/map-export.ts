export const PRINT_PRESETS={"8x10":{width:2400,height:3000,dpi:300},"11x14":{width:3300,height:4200,dpi:300},"16x20":{width:4800,height:6000,dpi:300},"18x24":{width:5400,height:7200,dpi:300}} as const;
export const MAP_STYLES=["atlas","minimal","heritage","botanical","midnight"] as const;
export const MAP_COMPOSITIONS=["world_story","venue_focus","journey_focus"] as const;
export const MAP_FRAMES=["world","fit_markers","regional","manual"] as const;
export type Coordinate={lng:number;lat:number};
export function geographicBounds(points:Coordinate[],padding=.08){if(!points.length)return{west:-180,east:180,south:-85,north:85};const lngs=points.map(p=>p.lng),lats=points.map(p=>p.lat),west=Math.min(...lngs),east=Math.max(...lngs),south=Math.max(-85,Math.min(...lats)),north=Math.min(85,Math.max(...lats)),lngPad=Math.max(2,(east-west)*padding),latPad=Math.max(2,(north-south)*padding);return{west:Math.max(-180,west-lngPad),east:Math.min(180,east+lngPad),south:Math.max(-85,south-latPad),north:Math.min(85,north+latPad)}}
export function exportDimensions(preset:keyof typeof PRINT_PRESETS,quality:"preview"|"print"="print"){const value=PRINT_PRESETS[preset];return quality==="print"?value:{...value,width:Math.round(value.width/4),height:Math.round(value.height/4),dpi:72}}
