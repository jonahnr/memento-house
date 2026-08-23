export type ProductTier={id:string;name:string;price:number;subtitle:string;cta:string;popular?:boolean;features:string[]};

export const mapTiers:ProductTier[]=[
 {id:"map",name:"Memento Map",price:99,subtitle:"Create your wedding map together.",cta:"Choose Memento Map",features:["Personalized interactive map and QR code","Couple story places, guest recommendations, and guest hometowns","Coordinated category colors and layer legend","Guest messages, couple dashboard, and permanent digital access"]},
 {id:"plus",name:"Memento Map Plus",price:129,subtitle:"Turn your wedding map into a map of your life together.",cta:"Choose Map Plus",popular:true,features:["Everything in Memento Map","Want to Go → Planning → Visited tracking","Voting, grouped recommendations, and advanced statistics","Visit dates, photos, memories, approved users, and print-ready PDF/PNG export"]},
 {id:"keepsake",name:"Memento Map Keepsake",price:199,subtitle:"Your digital story, made physical.",cta:"Choose Map Keepsake",features:["Everything in Map Plus","Professionally designed wedding QR display","Professionally produced physical map keepsake","Physical-to-digital QR connection and free shipping"]}
];

export const deckTiers:ProductTier[]=[
 {id:"essential",name:"Essential",price:139,subtitle:"Core experience",cta:"Choose Essential",features:["Up to 50 personalized cards","Standard designs and prompt collection","Full-color premium card production"]},
 {id:"signature",name:"Signature",price:169,subtitle:"More capacity",cta:"Choose Signature",features:["Up to 75 cards","Everything in Essential","Expanded prompt variety for larger celebrations"]},
 {id:"story",name:"Story",price:219,subtitle:"More couple-specific personalization",cta:"Choose Story",popular:true,features:["Up to 95 cards and everything in Signature","Rare Cards","10 uniquely personalized story cards","Relationship-inspired prompts"]},
 {id:"bespoke",name:"Bespoke",price:389,subtitle:"Fully customized around the couple",cta:"Choose Bespoke",features:["Up to 175 cards and Rare Cards","Open When package included","Fully custom prompts, categories, and card concepts","Deep story personalization"]}
];

export const unityTiers:ProductTier[]=[
 {id:"signature-board",name:"Unity Tile Signature Board",price:179,subtitle:"Personalized 18 × 24 ceremony keepsake",cta:"Choose Signature Board",features:["Interlocking couple name tiles","Relationship words coordinated into the board","Customizable number of signature spaces","Wedding palette, date, and frame-ready artwork"]},
 {id:"bespoke",name:"Bespoke Upgrade",price:199,subtitle:"Add to the Signature Board · $378 total",cta:"Choose Bespoke",popular:true,features:["Everything in the Signature Board","Custom palette, board and art direction","Custom typography and personalized wording","Up to two revision rounds"]}
];

export const canUseMapFeature=(tier:string,feature:"export"|"travelTracking"|"memories"|"physical")=>tier==="keepsake"||(tier==="plus"&&feature!=="physical");
export const orderHref=(product:string,tier:string)=>`/order?product=${encodeURIComponent(product)}&tier=${encodeURIComponent(tier)}`;
