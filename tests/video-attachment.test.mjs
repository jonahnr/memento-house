import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const routeUrl=new URL('../app/api/timeline-memory/route.ts',import.meta.url);
let source=await readFile(routeUrl,'utf8');
source=source.replace('"@supabase/supabase-js"',JSON.stringify(import.meta.resolve('@supabase/supabase-js')));
source=source.replace('"../../../lib/server-config"',JSON.stringify(new URL('../lib/server-config.ts',import.meta.url).href));
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const kind of ['owner','guest','wrong-owner'])test(`memory upload identity: ${kind==='wrong-owner'?'rejects an unrelated owner':kind+' attaches successfully'}`,async()=>{
 const original=global.fetch,prior=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 const expected=hash(kind==='guest'?'test-ip:guest-identity-12345':'owner:owner-user');let attached=false,inserted=0;
 global.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url||input),method=init?.method||'GET';let body=[];
  if(url.pathname.endsWith('/auth/v1/user'))body={id:kind==='wrong-owner'?'other-user':'owner-user'};
  else if(url.pathname.endsWith('/weddings'))body={id:'wedding-one',owner_user_id:'owner-user',contribution_status:'open'};
  else if(url.pathname.includes('/rpc/claim_guest_action'))body=true;
  else if(url.pathname.endsWith('/destinations'))body={id:'destination-one'};
  else if(url.pathname.endsWith('/timeline_entries')){if(method==='POST')inserted++;body={id:'entry-one'}}
  else if(url.pathname.endsWith('/media_assets')){
   if(method==='PATCH'){assert.equal(url.searchParams.get('actor_hash'),`eq.${expected}`);attached=true;body={id:'video-one'}}
   else if(url.searchParams.has('actor_hash'))body=url.searchParams.get('actor_hash')===`eq.${expected}`?{id:'video-one'}:null;
   else body=[{id:'video-one',media_type:'video',status:'ready',cloudflare_uid:'stream-one'}];
  } else if(url.pathname.endsWith('/timeline_photos'))body=null;
  else throw new Error(`Unexpected request ${method} ${url.pathname}`);
  return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
 const form=new FormData();for(const [key,value]of Object.entries({weddingId:'wedding-one',guest:'Test guest',title:'Test memory',story:'A remembered moment',place:'Cincinnati',date:'2026-09-09',anonymousId:'guest-identity-12345',mediaId:'video-one',startedAt:String(Date.now()-5000),lat:'39',lng:'-84'}))form.set(key,value);
 const result=await POST(new Request('https://test.local/api/timeline-memory',{method:'POST',headers:{'x-forwarded-for':'test-ip',...(kind==='guest'?{}:{Authorization:'Bearer test-session'})},body:form}));
 assert.equal(result.status,kind==='wrong-owner'?409:200);assert.equal(attached,kind!=='wrong-owner');assert.equal(inserted,kind==='wrong-owner'?0:1);
 }finally{global.fetch=original;if(prior===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=prior}
});
