import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
const root=process.env.PDF_NODE_MODULES||`${process.env.USERPROFILE}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/`;
const require=createRequire(root+'package.json');
const {createCanvas,DOMMatrix,ImageData,Path2D}=require('@napi-rs/canvas');
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {pathToFileURL}=await import('node:url');
const {getDocument}=await import(pathToFileURL(root+'pdfjs-dist/legacy/build/pdf.mjs'));
let count=0;
for(const file of (await readdir('tools/verification-qr-formats')).filter(f=>f.endsWith('.pdf'))){
 const name=file.slice(0,-4);
 const pdf=await getDocument({data:new Uint8Array(await readFile(`tools/verification-qr-formats/${file}`)),useSystemFonts:true}).promise;
 const page=await pdf.getPage(1),viewport=page.getViewport({scale:1.5}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height)),ctx=canvas.getContext('2d');
 await page.render({canvasContext:ctx,viewport}).promise;
 const copies=name.startsWith('double')?2:1;
 for(let copy=0;copy<copies;copy++){
  const height=Math.floor(canvas.height/copies),image=ctx.getImageData(0,copy*height,canvas.width,height),decoded=jsQR(image.data,image.width,image.height);
  assert.equal(decoded?.data,'https://mementohouse.com/map/alice-sam',`${file} QR scan ${copy+1}`);
 }
 await writeFile(`tools/verification-qr-formats/${name}-pdf.png`,canvas.toBuffer('image/png'));count++;
}
console.log(`All ${count} rendered PDFs scan to the correct map URL.`);
