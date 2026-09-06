import sharp from 'sharp';
import jsQR from 'jsqr';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
const input='tools/verification-cart-map/qr-clean.png';
const expected=await QRCode.toBuffer('https://mementohouse.com/map/alice-sam',{width:960,margin:4,errorCorrectionLevel:'H',color:{dark:'#282621',light:'#ffffff'}});
assert.deepEqual(await sharp(input).ensureAlpha().raw().toBuffer(),await sharp(expected).ensureAlpha().raw().toBuffer(),'QR image must be the untouched generated code, with no logo or central blank patch');
for(const size of [960,408,259,210,130]){
 const{data,info}=await sharp(input).resize(size,size).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const result=jsQR(new Uint8ClampedArray(data),info.width,info.height);
 assert.equal(result?.data,'https://mementohouse.com/map/alice-sam',`QR must decode at ${size}px`);
 console.log(`Clean QR decoded at ${size}px`);
}
