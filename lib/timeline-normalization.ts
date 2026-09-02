export type TimelineOrderItem={id:string;title:string;sort_date:string;date_value?:string|null;destination?:{latitude:number;longitude:number}|null};

export function normalizeTimelineOrder<T extends TimelineOrderItem>(items:T[]):T[]{
 return [...items].sort((a,b)=>a.sort_date.localeCompare(b.sort_date)||a.title.localeCompare(b.title)||String(a.id).localeCompare(String(b.id)));
}

export function numberTimelineLocations<T extends TimelineOrderItem>(items:T[]):Array<T&{order:number}>{
 return normalizeTimelineOrder(items).filter(item=>item.destination&&Number.isFinite(item.destination.latitude)&&Number.isFinite(item.destination.longitude)).map((item,index)=>({...item,order:index+1}));
}
