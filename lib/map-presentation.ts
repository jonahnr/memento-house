// Stored in the existing weddings.event_metadata JSON; absent keys preserve legacy behavior.
export const typographyThemes = [
 {id:"classic",name:"Classic",description:"The original Memento Map pairing",headline:'Georgia, serif',body:'Inter, "Segoe UI", sans-serif',accent:'Georgia, serif'},
 {id:"editorial",name:"Editorial",description:"Expressive serif headlines, quiet sans-serif text",headline:'"Palatino Linotype", Palatino, "Book Antiqua", serif',body:'Arial, sans-serif',accent:'Georgia, serif'},
 {id:"modern",name:"Modern",description:"Clean, contemporary sans-serif throughout",headline:'"Segoe UI", Arial, sans-serif',body:'"Segoe UI", Arial, sans-serif',accent:'"Segoe UI", Arial, sans-serif'},
 {id:"romantic",name:"Romantic",description:"Soft serif headlines with a flowing italic accent",headline:'Georgia, serif',body:'"Palatino Linotype", Palatino, serif',accent:'"Palatino Linotype", Palatino, serif'},
 {id:"timeless",name:"Timeless",description:"Traditional serif headlines and supporting text",headline:'"Times New Roman", Times, serif',body:'Georgia, serif',accent:'"Times New Roman", Times, serif'},
] as const;
export type TypographyTheme = typeof typographyThemes[number]["id"];
export type EventMetadata = Record<string,unknown> & {typography_theme?:TypographyTheme;include_guest_memories?:boolean};
export function typographyTheme(value:unknown){return typographyThemes.find(theme=>theme.id===value)||typographyThemes[0]}
export function includesGuestMemories(metadata?:EventMetadata|null){return metadata?.include_guest_memories!==false}
export function isGuestMemory(entry:{category:string}){return entry.category==="Guest Memory"}
export function visibleStoryMemories<T extends {category:string}>(entries:T[],metadata?:EventMetadata|null){return includesGuestMemories(metadata)?[...entries]:entries.filter(entry=>!isGuestMemory(entry))}
export function eventQrUrl(mapUrl:string){const url=new URL(mapUrl);url.searchParams.set("source","qr");url.searchParams.set("utm_source","event_qr");url.searchParams.set("utm_medium","print");return url.toString()}
export function isQrVisit(search:string){return new URLSearchParams(search).get("source")==="qr"}
