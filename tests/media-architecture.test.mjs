import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {formatVideoTime,summarizeVideoUsage,videoLimits} from "../lib/media.ts";
import {verifyStreamWebhook} from "../lib/cloudflare-stream.ts";

test("video usage counts ready duration and holds concurrent reservations",()=>{
 const limits=videoLimits("timeline-plus");
 assert.deepEqual(limits,{maxSeconds:600,maxVideos:20,maxIndividualSeconds:60,maxFileBytes:500_000_000});
 assert.deepEqual(summarizeVideoUsage([
  {status:"ready",duration_seconds:47.2,reserved_seconds:0},
  {status:"processing",duration_seconds:null,reserved_seconds:60},
  {status:"failed",duration_seconds:55,reserved_seconds:0}
 ],"timeline-plus"),{usedSeconds:48,reservedSeconds:60,remainingSeconds:492,videoCount:2,...limits});
 assert.equal(formatVideoTime(600),"10:00");
});

test("Stream webhook verification rejects replayed and changed payloads",()=>{
 process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET="test-only-webhook-secret";
 const raw=JSON.stringify({uid:"video-one",readyToStream:true}),time=2_000_000_000,signature=createHmac("sha256",process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET).update(`${time}.${raw}`).digest("hex"),header=`time=${time},sig1=${signature}`;
 assert.equal(verifyStreamWebhook(raw,header,time),true);
 assert.equal(verifyStreamWebhook(`${raw} `,header,time),false);
 assert.equal(verifyStreamWebhook(raw,header,time+301),false);
 delete process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
});

test("media migration is additive and reserves quota under a wedding lock",async()=>{
 const sql=await readFile(new URL("../supabase/migrations/011_unified_media_and_stream_video.sql",import.meta.url),"utf8");
 assert.match(sql,/create table if not exists public\.media_assets/i);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/least\(p_max_individual_seconds,remaining\)/);
 assert.match(sql,/if asset\.status in \('ready','deleted'\) then return asset\.id/);
 assert.doesNotMatch(sql,/drop table|alter table public\.timeline_photos/i);
});

test("video authorization creates a direct resumable upload",async()=>{
 const[source,tus]=await Promise.all([
  readFile(new URL("../lib/cloudflare-stream.ts",import.meta.url),"utf8"),
  readFile(new URL("../lib/tus-upload.ts",import.meta.url),"utf8")
 ]);
 assert.match(source,/direct_user=true/);
 assert.match(source,/"Tus-Resumable":"1\.0\.0"/);
 assert.match(source,/maxDurationSeconds/);
 assert.match(tus,/method:"PATCH"/);
 assert.match(tus,/Content-Type":"application\/offset\+octet-stream"/);
});
