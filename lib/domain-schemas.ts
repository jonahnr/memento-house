import {z} from "zod";

export const deckCustomizationSchema=z.object({
 tier:z.enum(["essential","signature","story","bespoke"]),
 names:z.object({partnerOne:z.string().min(1),partnerTwo:z.string().min(1)}),
 eventDate:z.string().default(""),
 eventType:z.string().default("Wedding"),
 style:z.string().default("Editorial"),
 photo:z.object({dataUrl:z.string().optional(),publicUrl:z.string().url().optional(),fileName:z.string().optional()}).optional(),
 colorPalette:z.string().default("Memento House"),
 enabledCategories:z.array(z.enum(["remember","advise","predict","adventure","together","confess"])).default(["remember","advise","predict","adventure","together","confess"]),
 personalizedPromptEligibility:z.boolean().default(false),
 addons:z.array(z.enum(["open-5","open-10"])).default([]),
}).passthrough();

export const timelineChapterSchema=z.object({
 id:z.string().optional(),date:z.string().nullable().optional(),approximateDate:z.string().nullable().optional(),
 title:z.string().min(1),category:z.string().min(1),story:z.string().default(""),location:z.string().nullable().optional(),
 latitude:z.number().min(-90).max(90).nullable().optional(),longitude:z.number().min(-180).max(180).nullable().optional(),
 photo:z.object({publicUrl:z.string().nullable(),altText:z.string().default("")}).nullable().optional(),
 privacy:z.enum(["private","link","public"]).default("private"),sortOrder:z.number().int().default(0),
 contributor:z.string().nullable().optional(),distanceFromPrevious:z.number().nonnegative().nullable().optional(),
});

export const proofSchema=z.object({id:z.string().uuid(),orderId:z.string().uuid(),version:z.number().int().positive(),
 originalFile:z.string(),watermarkedFile:z.string(),uploadedAt:z.string(),sentAt:z.string().nullable(),openedAt:z.string().nullable(),
 decision:z.enum(["approved","changes_requested"]).nullable(),feedback:z.string().nullable(),decisionAt:z.string().nullable(),supersededBy:z.string().uuid().nullable()});

export const orderEventSchema=z.object({orderId:z.string().uuid(),eventType:z.string().min(1),fromStatus:z.string().nullable().optional(),toStatus:z.string().nullable().optional(),actorType:z.string(),createdAt:z.string(),metadata:z.record(z.string(),z.unknown()).default({})});
export const entitlementSchema=z.object({entitlement:z.enum(["map_basic","map_plus","map_timeline_plus","deck_essential","deck_signature","deck_story","deck_bespoke","unity_standard","unity_bespoke"]),status:z.enum(["active","paused","revoked"])});
export const mapContributionSchema=z.object({place:z.string().min(2).max(300),message:z.string().max(1500).default(""),category:z.enum(["Guest Origin","Travel Recommendation","Couple Bucket List","Our Story"]),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),contributor:z.string().max(120)});

export function summarizeDeckCustomization(input:unknown){const value=deckCustomizationSchema.parse(input);return [
 ["Tier",value.tier],["Couple",`${value.names.partnerOne} + ${value.names.partnerTwo}`],["Event",`${value.eventType}${value.eventDate?` · ${value.eventDate}`:""}`],
 ["Style",value.style],["Palette",value.colorPalette],["Categories",value.enabledCategories.map(x=>x[0].toUpperCase()+x.slice(1)).join(", ")],
 ["Personalized prompts",value.personalizedPromptEligibility?"Included":"Not included"],["Add-ons",value.addons.length?value.addons.join(", "):"None"],
 ] as const}
