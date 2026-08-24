import {createRoot,type Root} from 'react-dom/client';
import type {Piece,Project} from './types';
import {CardCanvas} from './components/CardCanvas';
import {makePdf,makeZip,renderPng} from './exporter';

const nextPaint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
const workerCount=()=>Math.max(2,Math.min(4,(navigator.hardwareConcurrency||4)-1));

export async function exportDeck(project:Project,pieces:Piece[],kind:'pdf'|'zip'){
 const overlay=document.createElement('div');
 overlay.className='export-progress';
 overlay.innerHTML='<div><b>Preparing your complete deck</b><span>Loading reusable print assets…</span><progress max="100" value="0"></progress><small>0%</small></div>';
 document.body.appendChild(overlay);
 const progress=overlay.querySelector('progress')!,percent=overlay.querySelector('small')!,status=overlay.querySelector('span')!;
 const workers=Array.from({length:workerCount()},()=>{const host=document.createElement('div');host.className='export-render-host';document.body.appendChild(host);return{host,root:createRoot(host)}});
 const items=new Array<{data:string;piece:Piece}>(pieces.length);let cursor=0,complete=0;
 const renderWorker=async({host,root}:{host:HTMLDivElement;root:Root})=>{while(true){const index=cursor++;if(index>=pieces.length)return;const piece=pieces[index];root.render(<CardCanvas project={project} piece={piece} exporting/>);await nextPaint();const node=host.querySelector('.card-canvas') as HTMLElement|null;if(node){await Promise.all(Array.from(node.querySelectorAll('img')).map(img=>img.complete?img.decode().catch(()=>{}):new Promise<void>(resolve=>{img.onload=()=>resolve();img.onerror=()=>resolve()})));await nextPaint();items[index]={data:await renderPng(node,piece),piece}}complete++;const value=Math.round((complete/pieces.length)*90);progress.value=value;percent.textContent=`${value}%`;status.textContent=`Rendered ${complete} of ${pieces.length} cards · ${workers.length} at a time`;await new Promise(resolve=>setTimeout(resolve,0))}};
 try{await document.fonts.ready;await Promise.all(workers.map(renderWorker));status.textContent=kind==='zip'?'Compressing files…':'Building print-ready PDF…';progress.value=94;percent.textContent='94%';const finished=items.filter(Boolean);if(kind==='pdf')await makePdf(finished,`${project.info.projectName}_Print_Ready.pdf`);else await makeZip(project,finished);progress.value=100;percent.textContent='100%'}finally{for(const worker of workers){worker.root.unmount();worker.host.remove()}overlay.remove()}
}
