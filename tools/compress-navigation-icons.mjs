import fs from 'node:fs/promises';
import sharp from 'sharp';
const {icons}=JSON.parse(await fs.readFile(new URL('./navigation-icons.json',import.meta.url),'utf8'));
await fs.mkdir('public/brand/navigation',{recursive:true});
const tiles=[];
for(const icon of icons){
 const file=`public/brand/navigation/${icon.name}.webp`;
 await sharp(icon.path).resize(84,84,{fit:'contain',background:'#00000000'}).webp({quality:82,effort:6}).toFile(file);
 console.log(`${file}: ${(await fs.stat(file)).size} bytes`);
 tiles.push({input:await sharp(file).resize(112,112).png().toBuffer(),left:32+(tiles.length%3)*176,top:24+Math.floor(tiles.length/3)*150});
}
await sharp({create:{width:528,height:450,channels:4,background:'#f5f0e7'}}).composite(tiles).png().toFile('tools/navigation-icons-preview.png');
