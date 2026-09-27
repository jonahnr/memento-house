import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const cache=new Map();
export async function moduleUrl(url){
 if(cache.has(url.href))return cache.get(url.href);
 let source=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...source.matchAll(/from\s+["']([^"']+)["']/g)]){
  const spec=match[1],resolved=spec.startsWith('.')?await moduleUrl(new URL(spec.endsWith('.ts')?spec:spec+'.ts',url)):import.meta.resolve(spec);
  source=source.replace(match[0],`from ${JSON.stringify(resolved)}`);
 }
 const result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(url.href,result);return result;
}
export async function loadTs(path){return import(await moduleUrl(new URL('../../'+path,import.meta.url)))}
