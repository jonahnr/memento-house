import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const {POST}=await loadTs('app/api/checkout/route.ts');
const {fulfillPurchase}=await loadTs('lib/fulfillment.ts');
const selections=[['wedding',''],['family_reunion',''],['celebration_of_life',''],['next_chapter',''],['events_community',''],['wedding','anniversary']];
function database(){
 const rows={};let serial=0;const calls=[];
 const admin={auth:{admin:{updateUserById:async()=>({error:null})}},async rpc(name,args){
  calls.push({name,args});const id=`map-${++serial}`;rows.weddings??=[];rows.weddings.push({id,map_type:args.p_map_type,map_tier:args.p_map_tier,configured_at:null});return{data:{id},error:null};
 },from(table){rows[table]??=[];let filters=[],operation,values,options={},one=false;
  const query={select(){return query},eq(k,v){filters.push(row=>row[k]===v);return query},is(k,v){filters.push(row=>row[k]===v);return query},limit(){return query},maybeSingle(){one=true;return query},single(){one=true;return query},upsert(value,opts){operation='upsert';values=value;options=opts;return query},insert(value){operation='insert';values=value;return query},update(value){operation='update';values=value;return query},then(resolve,reject){return Promise.resolve().then(()=>{
   if(operation==='upsert'){const keys=options.onConflict.split(','),existing=rows[table].find(row=>keys.every(key=>row[key]===values[key]));if(!existing)rows[table].push({id:`row-${++serial}`,...values});else if(!options.ignoreDuplicates)Object.assign(existing,values)}
   if(operation==='insert')rows[table].push({id:`row-${++serial}`,...values});if(operation==='update')rows[table].filter(row=>filters.every(filter=>filter(row))).forEach(row=>Object.assign(row,values));
   const found=rows[table].filter(row=>filters.every(filter=>filter(row)));return{data:one?found[0]||null:found,error:null};
  }).then(resolve,reject)}};return query}};return{admin,rows,calls};
}
for(const tier of ['map','plus','timeline-plus'])for(const [type,occasion]of selections)test(`checkout, cancel and paid provisioning retain ${tier}/${occasion||type}`,async()=>{
 const oldFetch=global.fetch,oldStripe=process.env.STRIPE_SECRET_KEY,oldSupabase=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.STRIPE_SECRET_KEY='sk_test_fixture';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-service';let stripeBody;
 global.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url||input);if(url.pathname.endsWith('/auth/v1/user'))return Response.json({id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.com'});if(url.hostname==='api.stripe.com'){stripeBody=new URLSearchParams(init.body);return Response.json({url:'https://checkout.stripe.com/c/pay/cs_test_fixture'})}throw new Error(`Unexpected external call: ${url.origin}${url.pathname}`)};
 try{
  const form=new FormData();for(const [key,value]of Object.entries({product:'map',tier,mapType:type,mapOccasion:occasion,addon:'none'}))form.set(key,value);
  const response=await POST(new Request('https://mementohouse.com/api/checkout',{method:'POST',headers:{Authorization:'Bearer fixture'},body:form}));assert.equal(response.status,200);assert.match((await response.json()).url,/cs_test_fixture/);
  assert.equal(stripeBody.get('metadata[tier]'),tier);assert.equal(stripeBody.get('metadata[map_type]'),type);assert.equal(stripeBody.get('metadata[map_occasion]'),occasion);
  const cancel=new URL(stripeBody.get('cancel_url'));assert.equal(cancel.searchParams.get('tier'),tier);assert.equal(cancel.searchParams.get('type'),type);assert.equal(cancel.searchParams.get('occasion')||'',occasion);
  const db=database(),result=await fulfillPurchase(db.admin,{source:'stripe',sourceId:'cs_test_fixture',email:'fixture@example.com',userId:'11111111-1111-4111-8111-111111111111',product:'map',tier:stripeBody.get('metadata[tier]'),mapType:stripeBody.get('metadata[map_type]'),mapOccasion:stripeBody.get('metadata[map_occasion]'),addons:[],amount:tier==='map'?9900:tier==='plus'?12900:17900,isTest:true});
  assert.ok(result.mapId);assert.equal(db.rows.weddings[0].map_type,type);assert.equal(db.rows.weddings[0].map_tier,tier);assert.equal(db.rows.weddings[0].map_subtype||'',occasion);assert.equal(db.calls[0].name,'provision_paid_memento_map');assert.ok(db.calls[0].args.p_categories.length>0);
  await fulfillPurchase(db.admin,{source:'stripe',sourceId:'cs_test_fixture',email:'fixture@example.com',userId:'11111111-1111-4111-8111-111111111111',product:'map',tier,mapType:type,mapOccasion:occasion,addons:[],amount:9900,isTest:true});assert.equal(db.rows.weddings.length,1);
 }finally{global.fetch=oldFetch;if(oldStripe===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=oldStripe;if(oldSupabase===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldSupabase}
});
