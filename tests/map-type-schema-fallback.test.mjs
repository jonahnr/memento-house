import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("public QR map loader preserves existing links before the type migration",()=>{
 const source=fs.readFileSync(new URL("../app/map/[slug]/wedding-experience.tsx",import.meta.url),"utf8");
 assert.ok(source.includes("if(wError)"));
 assert.ok(source.includes('select("id,partner_one_name,partner_two_name,wedding_date,title,slug,welcome_message")'));
 assert.ok(source.includes('.eq("slug",slug).eq("status","active").single()'));
});

test("plan and contribution APIs fall back when the type schema is unavailable",()=>{
 const plan=fs.readFileSync(new URL("../app/api/map-plan/route.ts",import.meta.url),"utf8");
 const contribution=fs.readFileSync(new URL("../app/api/contribution/route.ts",import.meta.url),"utf8");
 assert.ok(plan.includes("if(weddingError)"));
 assert.ok(plan.includes('select("id,owner_user_id")'));
 assert.ok(contribution.includes("if(weddingResult.error)"));
});
