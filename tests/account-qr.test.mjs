import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import jsQR from 'jsqr';
import {loadTs} from './helpers/load-ts.mjs';
const {GET}=await loadTs('app/api/qr/route.ts');
test('account QR endpoint encodes application behavior and analytics attribution',async()=>{
 const response=await GET(new Request('https://mementohouse.com/api/qr?url='+encodeURIComponent('https://mementohouse.com/map/existing-map')));assert.equal(response.status,200);
 const {data,info}=await sharp(Buffer.from(await response.arrayBuffer())).ensureAlpha().raw().toBuffer({resolveWithObject:true});const decoded=jsQR(new Uint8ClampedArray(data),info.width,info.height);assert.ok(decoded);const target=new URL(decoded.data);assert.equal(target.pathname,'/map/existing-map');assert.equal(target.searchParams.get('source'),'qr');assert.equal(target.searchParams.get('utm_source'),'event_qr');
});
test('account QR keeps the existing URL allowlist',async()=>{
 for(const url of ['https://other.example/map/test','http://mementohouse.com/map/test','https://mementohouse.com/account'])assert.equal((await GET(new Request('https://mementohouse.com/api/qr?url='+encodeURIComponent(url)))).status,400);
});
