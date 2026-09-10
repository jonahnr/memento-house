import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("public QR map loader preserves existing links before the type migration",()=>{
 const source=fs.readFileSync(new URL("../app/map/[slug]/wedding-experience.tsx",import.meta.url),"utf8");
 assert.ok(source.includes('wError?.code==="42703"'));
 assert.ok(source.includes('select("id,partner_one_name,partner_two_name,wedding_date,title,slug,welcome_message")'));
 assert.ok(source.includes('.eq("slug",slug).eq("status","active").single()'));
});
