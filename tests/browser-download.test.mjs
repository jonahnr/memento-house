import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverBrowserFile,isAppleMobileBrowser} from '../lib/browser-download.ts';

test('export delivery recognizes iPhone, iPad, desktop Safari, and Android correctly',()=>{
 assert.equal(isAppleMobileBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)','iPhone',5),true);
 assert.equal(isAppleMobileBrowser('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)','iPad',5),true);
 assert.equal(isAppleMobileBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X)','MacIntel',0),false);
 assert.equal(isAppleMobileBrowser('Mozilla/5.0 (Linux; Android 15; Pixel 9)','Linux armv8l',5),false);
 assert.equal(isAppleMobileBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X)','MacIntel',5),true);
});

test('iPhone export opens the prepared Safari tab and retains the Blob URL',()=>{
 let opened='';
 const previousWindow=globalThis.window;
 globalThis.window={setTimeout:()=>0,location:{assign:value=>{opened=value}}};
 try{
  const preview={location:{replace:value=>{opened=value}}};
  const notice=deliverBrowserFile(new Blob(['map'],{type:'image/png'}),'map.png',{appleMobile:true,preview});
  assert.match(opened,/^blob:/);
  assert.match(notice,/opened in Safari/);
 }finally{globalThis.window=previousWindow}
});

test('desktop export keeps the direct-download path and filename',()=>{
 let clicked=false,appended=false;
 const link={download:'',href:'',style:{},click:()=>{clicked=true},remove:()=>{}};
 const previousWindow=globalThis.window,previousDocument=globalThis.document;
 globalThis.window={setTimeout:()=>0,location:{assign:()=>{}}};
 globalThis.document={createElement:()=>link,body:{appendChild:()=>{appended=true}}};
 try{
  const notice=deliverBrowserFile(new Blob(['map'],{type:'application/pdf'}),'map.pdf',{appleMobile:false,preview:null});
  assert.equal(link.download,'map.pdf');assert.equal(clicked,true);assert.equal(appended,true);assert.match(notice,/downloaded/);
 }finally{globalThis.window=previousWindow;globalThis.document=previousDocument}
});
