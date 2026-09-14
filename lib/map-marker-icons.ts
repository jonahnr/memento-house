/** Small monochrome SVG symbols; only static paths are inserted into map markers. */
export function mapMarkerIcon(category:string,status?:string){
 const value=category.toLowerCase().trim();
 if(/guest origin|family origin|attendee|where we live/.test(value))return {name:"home",path:"M3 10 12 3l9 7 M5 9v12h5v-7h4v7h5V9"};
 if(status==="visited")return {name:"completed",path:"m5 12 4 4L19 6"};
 if(status==="planning"||status==="want_to_go"||/bucket|future idea/.test(value))return {name:"bucket-list",path:"M6 21V3m0 1h12l-3 4 3 4H6"};
 if(/food|restaurant/.test(value))return {name:"food",path:"M4 3v6a3 3 0 0 0 6 0V3M7 3v18M17 3v18m0-18c-4 4-4 9 0 9"};
 if(/romantic|favorite/.test(value))return {name:"heart",path:"M12 21 3 12C-3 3 8 0 12 7c4-7 15-4 9 5Z"};
 if(/beach|relax/.test(value))return {name:"sun",path:"M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"};
 if(/outdoor|adventure/.test(value))return {name:"mountain",path:"m2 21 7-16 5 10 3-6 5 12ZM6 12l3 2 3-2"};
 if(/city|work|career|organization|event location/.test(value))return {name:"city",path:"M3 21V8h7v13M10 21V3h11v18M1 21h22M6 11v2m0 3v2m8-11h3m-3 4h3m-3 4h3"};
 if(/culture|school/.test(value))return {name:"culture",path:"m2 7 10-5 10 5ZM4 10v9m5-9v9m6-9v9m5-9v9M2 22h20"};
 if(/home|live|childhood|origin/.test(value))return {name:"home",path:"M3 10 12 3l9 7 M5 9v12h5v-7h4v7h5V9"};
 if(/milestone|previous reunion/.test(value))return {name:"milestone",path:"M5 21V5h14v16M3 21h18M8 9h8M8 13h8M8 17h5"};
 if(/memor|story/.test(value))return {name:"memory",path:"M4 5h16v14H4ZM8 15l3-3 2 2 3-4 2 3M8 9h.01"};
 if(/travel|trip|vacation/.test(value))return {name:"travel",path:"m3 10 7 1 4-8 3 1-2 8 6 3v2l-7-1-3 6-2-1 1-6-7-3Z"};
 if(/recommend|important place/.test(value))return {name:"recommendation",path:"M12 22s8-8 8-13a8 8 0 0 0-16 0c0 5 8 13 8 13ZM9 9l2 2 4-4"};
 if(/chapter|group/.test(value))return {name:"community",path:"M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-1a3 3 0 1 0 0-6m-8 9c-4 0-6 2-6 5h12c0-3-2-5-6-5m8-1c4 0 6 2 6 5h-6"};
 return {name:"place",path:"M12 22s8-8 8-13a8 8 0 0 0-16 0c0 5 8 13 8 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6"};
}
export function mapMarkerSvg(category:string,status?:string){const icon=mapMarkerIcon(category,status);return `<svg data-icon="${icon.name}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.path}"/></svg>`}
