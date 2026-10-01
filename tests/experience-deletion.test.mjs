import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=(await readFile('app/api/maps/delete/route.ts','utf8'))
 .replace(/import \{requireUser\}[^\n]+/, 'const requireUser=async()=>globalThis.deletionFixture.identity;')
 .replace(/import \{deleteStreamVideo\}[^\n]+/, 'const deleteStreamVideo=async(uid)=>{globalThis.deletionFixture.videos.push(uid);if(globalThis.deletionFixture.cleanupFailure)throw new Error("provider failed")};');
const {DELETE}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
function fixture({owned=true,cleanupFailure=false,shared=false}={}){
 const state={queries:[],videos:[],removedPaths:[],cleanupFailure};
 const admin={from(table){const query={table,filters:[],action:'select'};state.queries.push(query);const chain={select(){return chain},eq(key,value){query.filters.push([key,value]);return chain},neq(key,value){query.filters.push(['not:'+key,value]);return chain},in(){return chain},delete(){query.action='delete';return chain},maybeSingle(){return Promise.resolve(result())},single(){return Promise.resolve(result())},then(resolve,reject){return Promise.resolve(result()).then(resolve,reject)}};
 function result(){if(table==='weddings'){if(query.action==='delete')return {data:{id:'map'},error:null};if(query.filters.some(([key])=>key==='not:id'))return {data:shared?[{id:'other'}]:[],error:null};assert.ok(query.filters.some(([key,value])=>key==='owner_user_id'&&value==='owner'));return {data:owned?{id:'map'}:null,error:null}}
 if(table==='media_assets')return {data:query.filters.some(([key])=>key==='wedding_id')?[{storage_path:'owner/photo.jpg',cloudflare_uid:'video-one'}]:shared?[{storage_path:'owner/photo.jpg'}]:[],error:null};return {data:[],error:null}}
 return chain},storage:{from(){return {async remove(paths){state.removedPaths.push(...paths);return {error:null}}}}}};
 state.identity={admin,user:{id:'owner'}};globalThis.deletionFixture=state;return state;
}
const request=(confirmation='DELETE')=>new Request('https://local/api/maps/delete',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({mapId:'map',confirmation})});
test('experience deletion requires authentication and exact final confirmation',async()=>{const state=fixture();state.identity=null;assert.equal((await DELETE(request())).status,401);fixture();assert.equal((await DELETE(request('delete'))).status,400);assert.equal(globalThis.deletionFixture.queries.length,0)});
test('another customer cannot delete an experience or its media',async()=>{const state=fixture({owned:false});assert.equal((await DELETE(request())).status,404);assert.equal(state.queries.length,1);assert.deepEqual(state.videos,[])});
test('owned experience cleans providers then deletes the cascade root with ownership constraint',async()=>{const state=fixture();assert.equal((await DELETE(request())).status,200);assert.deepEqual(state.videos,['video-one']);assert.deepEqual(state.removedPaths,['owner/photo.jpg']);const removed=state.queries.find(query=>query.action==='delete');assert.equal(removed.table,'weddings');assert.deepEqual(removed.filters,[['id','map'],['owner_user_id','owner']])});
test('provider cleanup failure retains the relational experience for retry',async()=>{const state=fixture({cleanupFailure:true});assert.equal((await DELETE(request())).status,502);assert.equal(state.queries.some(query=>query.action==='delete'),false)});
test('photos reused in another experience remain in storage',async()=>{const state=fixture({shared:true});assert.equal((await DELETE(request())).status,200);assert.deepEqual(state.removedPaths,[])});
