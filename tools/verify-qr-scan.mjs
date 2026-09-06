import sharp from 'sharp';
import jsQR from 'jsqr';
import assert from 'node:assert/strict';
const input='tools/verification-cart-map/qr-logo.png';
for(const size of [960,408,259,210,130]){
 const{data,info}=await sharp(input).resize(size,size).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const result=jsQR(new Uint8ClampedArray(data),info.width,info.height);
 assert.equal(result?.data,'https://mementohouse.com/map/alice-sam',`QR must decode at ${size}px`);
 console.log(`Logo QR decoded at ${size}px`);
}
