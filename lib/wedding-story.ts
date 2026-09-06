export type WeddingStoryRecord={id:string;title:string;description:string;story_type:string;event_date:string|null;image_url:string|null;location_name:string;latitude:number;longitude:number;sort_order:number};
type WeddingDetails={id:string;wedding_date:string|null};
const venueDescription="The gathering point used to calculate guest travel distance.";
/** Project the venue into the story without creating a second database record. */
export function withWeddingStory(wedding:WeddingDetails,stories:WeddingStoryRecord[]):WeddingStoryRecord[]{
 const venue=stories.find(story=>story.story_type==="Wedding Venue");
 if(!venue&&!wedding.wedding_date)return stories;
 const chapter:WeddingStoryRecord={id:venue?.id||`wedding-${wedding.id}`,title:venue?.title&&venue.title!=="Wedding Venue"?venue.title:"Our wedding",description:venue?.description&&venue.description!==venueDescription?venue.description:"The day we celebrated our love with our favorite people.",story_type:"Wedding Venue",event_date:wedding.wedding_date||venue?.event_date||null,image_url:venue?.image_url||null,location_name:venue?.location_name||"",latitude:venue?.latitude??NaN,longitude:venue?.longitude??NaN,sort_order:venue?.sort_order??-1};
 return[...stories.filter(story=>story.story_type!=="Wedding Venue"),chapter];
}
