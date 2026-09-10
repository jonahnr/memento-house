export type ProductTier={id:string;name:string;price:number;subtitle:string;cta:string;popular?:boolean;features:string[]};

export const mapTiers:ProductTier[]=[
 {id:"map",name:"Memento Map",price:99,subtitle:"Create an interactive map around your moment.",cta:"Choose Memento Map",features:["Personalized interactive map and QR code","Shared places, participant contributions, and real locations","Coordinated category colors and layer legend","Messages, owner dashboard, and permanent digital access"]},
 {id:"plus",name:"Memento Map Plus",price:129,subtitle:"Turn your event map into a map that keeps growing.",cta:"Choose Map Plus",popular:true,features:["Everything in Memento Map","Want to Go → Planning → Visited tracking","Voting, grouped contributions, and advanced statistics","Visit dates, photos, memories, and print-ready PNG export"]}
 ,{id:"timeline-plus",name:"Timeline Plus",price:179,subtitle:"Your map becomes a living, chronological story",cta:"Choose Timeline Plus",features:["Everything in Map Plus","A synchronized map and chronological timeline","Participant memories automatically update into your timeline","Shareable story view and combined keepsake export"]}
];

export const deckTiers:ProductTier[]=[
 {id:"essential",name:"Essential",price:139,subtitle:"Core experience",cta:"Choose Essential",features:["50 guest Mementos","Custom couple deck photo","Standard designs and prompt collection","Full-color premium card production"]},
 {id:"signature",name:"Signature",price:169,subtitle:"More capacity",cta:"Choose Signature",features:["75 guest Mementos","Everything in Essential","Expanded prompt variety for larger celebrations"]},
 {id:"story",name:"Story",price:219,subtitle:"More couple-specific personalization",cta:"Choose Story",popular:true,features:["95 guest Mementos and everything in Signature","Rare Cards","10 uniquely personalized story cards","Relationship-inspired prompts"]},
 {id:"bespoke",name:"Bespoke",price:389,subtitle:"Fully customized around the couple",cta:"Choose Bespoke",features:["175 guest Mementos and Rare Cards","Open When add-on cards included","Fully custom prompts, categories, and card concepts","Deep story personalization"]}
];

export const unityTiers:ProductTier[]=[
 {id:"signature-board",name:"Unity Tile Signature Board",price:179,subtitle:"Personalized 18 × 24 ceremony keepsake",cta:"Choose Signature Board",features:["Interlocking couple name tiles","Relationship words coordinated into the board","Customizable number of signature spaces","Wedding palette, date, and frame-ready artwork"]},
 {id:"bespoke",name:"Bespoke Upgrade",price:199,subtitle:"Add to the Signature Board · $378 total",cta:"Choose Bespoke",popular:true,features:["Everything in the Signature Board","Custom palette, board and art direction","Custom typography and personalized wording","Up to two revision rounds"]}
];

export const canUseMapFeature=(tier:string,feature:"export"|"travelTracking"|"memories"|"timeline"|"physical")=>tier==="timeline-plus"?feature!=="physical":tier==="plus"&&feature!=="timeline"&&feature!=="physical";
export const orderHref=(product:string,tier:string)=>`/order?product=${encodeURIComponent(product)}&tier=${encodeURIComponent(tier)}`;
