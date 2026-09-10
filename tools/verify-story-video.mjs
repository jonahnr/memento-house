import {chromium,expect} from "@playwright/test";
import assert from "node:assert/strict";

const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 const user={id:"owner-user",email:"owner@example.com",aud:"authenticated",role:"authenticated",user_metadata:{product_tier:"timeline-plus"}},wedding={id:"wedding-one",partner_one_name:"Alice",partner_two_name:"Sam",wedding_date:"2026-10-01",title:"Our Adventure Map",slug:"alice-sam",accent_color:"#b78338"},video={id:"video-one",media_type:"video",status:"ready",cloudflare_uid:"stream-one",thumbnail_url:"/brand/memento-house-logo.webp",duration_seconds:10,story_location_id:null};
 let saved,attached;
 await context.route("**/*.supabase.co/**",route=>{const url=new URL(route.request().url()),method=route.request().method();let data=[];if(url.pathname.includes("/auth/"))data={user};else if(url.pathname.includes("/weddings"))data=wedding;else if(url.pathname.includes("/story_locations")){if(method==="POST"){saved={id:"story-one",...route.request().postDataJSON()};data=saved}else data=[]}return route.fulfill({json:data})});
 await context.route("**/api/map-plan?**",route=>route.fulfill({json:{tier:"timeline-plus",access:true}}));
 await context.route("**/api/media?**",route=>route.fulfill({json:{assets:[video],usage:{usedSeconds:10,reservedSeconds:0,remainingSeconds:590,videoCount:1,maxSeconds:600,maxVideos:20,maxIndividualSeconds:60,maxFileBytes:500000000},videoEnabled:true}}));
 await context.route("**/api/media",route=>{attached=route.request().postDataJSON();video.story_location_id="story-one";return route.fulfill({json:{asset:video}})});
 await context.route("**/api/location-search?**",route=>{const url=new URL(route.request().url());return route.fulfill({json:url.searchParams.get("placeId")?{place:{id:"place-one",name:"Cincinnati, Ohio",lat:39.1,lng:-84.5,provider:"google"}}:{provider:"google",places:[{id:"place-one",name:"Cincinnati, Ohio",provider:"google"}]}})});
 await context.route("https://iframe.videodelivery.net/**",route=>route.fulfill({contentType:"text/html",body:"<html><body>video fixture</body></html>"}));
 await context.addInitScript(user=>localStorage.setItem("sb-kdcymeoldvwlmfwemfgq-auth-token",JSON.stringify({access_token:"fixture-token",refresh_token:"fixture-refresh",expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:"bearer",user})),user);
 await page.goto("http://127.0.0.1:3000/dashboard");
 await page.getByRole("button",{name:"Our Story",exact:true}).click();
 await page.getByRole("button",{name:"Video",exact:true}).click();
 await expect(page.getByText("Or use an uploaded video")).toBeVisible();
 await page.getByLabel("Or use an uploaded video").selectOption("video-one");
 await page.getByLabel("Milestone title").fill("Our video milestone");
 await page.getByLabel("Your story",{exact:true}).fill("A milestone captured on video.");
 const search=page.getByRole("textbox",{name:"Search for a real address or location"});await search.fill("Cincinnati");await page.getByRole("button",{name:/Cincinnati, Ohio/}).click();
 await page.getByRole("button",{name:"Add milestone",exact:true}).click();
 await page.locator(".storyList").getByText("Our video milestone",{exact:true}).waitFor();await expect(page.locator(".storyList .streamPlayer")).toBeVisible();
 assert.equal(saved.image_url,null);assert.deepEqual(attached,{weddingId:"wedding-one",mediaId:"video-one",targetType:"story",targetId:"story-one"});assert.deepEqual(errors,[]);
 await page.locator(".storyWorkspace").screenshot({path:"outputs/video-verification/story-video-dashboard.png"});
 console.log(JSON.stringify({passed:true,reusedProcessedUpload:true,attachedToStory:attached.targetId,photoCleared:saved.image_url===null,runtimeErrors:errors}));
}finally{await browser.close()}
