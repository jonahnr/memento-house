import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
let source=await readFile(new URL('../lib/fulfillment.ts',import.meta.url),'utf8');
for(const name of ['order-domain','product-catalog','memento-map-types'])source=source.replace(new RegExp(`"\\./${name}(?:\\.ts)?"`),JSON.stringify(new URL(`../lib/${name}.ts`,import.meta.url).href));
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const{fulfillPurchase}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function database(){
 const rows={},failures=new Set();let serial=0;
 const admin={auth:{admin:{updateUserById:async()=>({error:null})}},from(table){rows[table]??=[];let filters=[],operation=null,values,options={},one=false;
  const query={select(){return query},eq(key,value){filters.push(row=>row[key]===value);return query},limit(){return query},maybeSingle(){one=true;return query},single(){one=true;return query},upsert(value,opts){operation='upsert';values=value;options=opts;return query},insert(value){operation='insert';values=value;return query},update(value){operation='update';values=value;return query},then(resolve,reject){return Promise.resolve().then(()=>{if(failures.delete(table))return{data:null,error:new Error(`Failed ${table}`)};if(operation==='upsert'){const keys=options.onConflict.split(','),existing=rows[table].find(row=>keys.every(key=>row[key]===values[key]));if(!existing)rows[table].push({id:`row-${++serial}`,...values});else if(!options.ignoreDuplicates)Object.assign(existing,values)}if(operation==='insert')rows[table].push({id:`row-${++serial}`,...values});if(operation==='update')rows[table].filter(row=>filters.every(filter=>filter(row))).forEach(row=>Object.assign(row,values));const found=rows[table].filter(row=>filters.every(filter=>filter(row)));return{data:one?found[0]||null:found,error:null}}).then(resolve,reject)}};return query}};
 return{admin,rows,failures};
}
const input={source:'stripe',sourceId:'cs_test_cart',email:'fixture@example.com',userId:'fixture-user',product:'deck',tier:'bespoke',addons:[],amount:38900};
test('fulfillment retries preserve order progress and do not duplicate entitlements',async()=>{const db=database();const first=await fulfillPurchase(db.admin,input);first.order.order_status='shipped';db.rows.entitlements[0].status='revoked';await fulfillPurchase(db.admin,input);assert.equal(db.rows.orders.length,1);assert.equal(db.rows.orders[0].order_status,'shipped');assert.equal(db.rows.entitlements[0].status,'revoked');assert.equal(db.rows.order_events.length,1)});
test('failed entitlement writes remain retryable and never report completed fulfillment',async()=>{const db=database();db.failures.add('entitlements');await assert.rejects(fulfillPurchase(db.admin,input),/Failed entitlements/);assert.equal(db.rows.order_events?.length||0,0);await fulfillPurchase(db.admin,input);assert.equal(db.rows.orders.length,1);assert.equal(db.rows.entitlements.length,1);assert.equal(db.rows.questionnaires.length,1);assert.equal(db.rows.fulfillment_jobs.length,1);assert.equal(db.rows.order_events.length,1)});
