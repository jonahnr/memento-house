// Canvas PNGs have enough pixels but browsers commonly label them as 96 DPI.
// Add the physical density so print applications also see the intended dimensions.
export async function pngWithDpi(blob:Blob,dpi=300){
 const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer);
 if(bytes.length<33||view.getUint32(0)!==0x89504e47||view.getUint32(4)!==0x0d0a1a0a)throw new Error("Invalid PNG export.");
 const chunk=new Uint8Array(21),data=new DataView(chunk.buffer);data.setUint32(0,9);chunk.set([112,72,89,115],4);const density=Math.round(dpi/0.0254);data.setUint32(8,density);data.setUint32(12,density);chunk[16]=1;
 let crc=0xffffffff;for(const byte of chunk.slice(4,17)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}data.setUint32(17,(crc^0xffffffff)>>>0);
 const parts:BlobPart[]=[bytes.slice(0,33),chunk];for(let offset=33;offset<bytes.length;){const length=view.getUint32(offset)+12;if(length<12||offset+length>bytes.length)throw new Error("Incomplete PNG export.");if(String.fromCharCode(...bytes.slice(offset+4,offset+8))!=="pHYs")parts.push(bytes.slice(offset,offset+length));offset+=length}
 return new Blob(parts,{type:"image/png"});
}
