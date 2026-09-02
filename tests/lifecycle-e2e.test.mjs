import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {PRODUCT_CATALOG} from "../lib/product-catalog.ts";
import {assertTransition,initialPaidState} from "../lib/order-domain.ts";

const advance=(states)=>{for(let index=1;index<states.length;index++)assert.doesNotThrow(()=>assertTransition(states[index-1],states[index]));return states.at(-1)};

test("every permanent catalog product has a complete post-purchase lifecycle",()=>{
 for(const product of PRODUCT_CATALOG){
  if(product.fulfillmentWorkflow==="digital_map"){
   assert.equal(product.questionnaireType,"none");
   assert.equal(initialPaidState("digital_map",false),"account_ready");
   assert.equal(advance(["paid","account_ready","active"]),"active");
  }else if(product.questionnaireType==="none"){
   assert.equal(initialPaidState("custom_print",false),"proof_ready");
   assert.equal(advance(["paid","proof_ready","awaiting_customer_approval","approved","in_production","ready_to_ship","shipped","delivered","completed"]),"completed");
  }else{
   assert.equal(initialPaidState("custom_print",true),"awaiting_customer_information");
   assert.equal(advance(["paid","awaiting_customer_information","proof_ready","awaiting_customer_approval","changes_requested","proof_ready","awaiting_customer_approval","approved","in_production","ready_to_ship","shipped","delivered","completed"]),"completed");
  }
 }
});

test("proactive production health is scheduled, persisted, and visible to administrators",async()=>{
 const [config,route,migration,admin]=await Promise.all([readFile(new URL("../vercel.json",import.meta.url),"utf8"),readFile(new URL("../app/api/system-health/route.ts",import.meta.url),"utf8"),readFile(new URL("../supabase/migrations/010_proactive_system_health.sql",import.meta.url),"utf8"),readFile(new URL("../app/admin/orders/page.tsx",import.meta.url),"utf8")]);
 assert.match(config,/0 12 \* \* \*/);assert.match(route,/CRON_SECRET/);assert.match(migration,/system_health_runs/);for(const label of ["Stripe API","Resend API","Order lifecycle integrity","Latest automated lifecycle checks"])assert.match(`${await readFile(new URL("../lib/system-health.ts",import.meta.url),"utf8")} ${admin}`,new RegExp(label));
});

test("map title and active Timeline marker use the authoritative record identity",async()=>{
 const [dashboard,map]=await Promise.all([readFile(new URL("../app/dashboard/dashboard.tsx",import.meta.url),"utf8"),readFile(new URL("../app/map/[slug]/adventure-map.tsx",import.meta.url),"utf8")]);
 assert.doesNotMatch(dashboard,/Our Wedding World/i);assert.match(dashboard,/wedding\.title\|\|"Our Adventure Map"/);assert.match(map,/String\(selected\.id\)===String\(story\.id\)/);assert.match(map,/sort\(\(a,b\)=>Number\(selectedStory\(a\)\)-Number\(selectedStory\(b\)\)\)/);
});
