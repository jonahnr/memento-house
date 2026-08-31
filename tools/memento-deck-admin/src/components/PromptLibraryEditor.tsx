import {Plus,RotateCcw,Trash2} from 'lucide-react';
import {defaultTemplates} from '../data';
import type {CategoryId,Project} from '../types';
import {Field,Section} from './Panel';

const copy=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));

export function PromptLibraryEditor({project:p,setProject:set,onSelect}:{project:Project;setProject:any;onSelect:(id:CategoryId)=>void}){
  const update=(templateIndex:number,mutate:(project:Project)=>void)=>set((current:Project)=>{const next=copy(current);mutate(next);next.templates[templateIndex].prompt=next.templates[templateIndex].prompts[0]||'';return next});
  return <Section title="Prompt library" eyebrow="STEP 4">
    <p className="hint">Each row becomes a separate card. Add, replace, reorder, or remove questions without editing a large text block.</p>
    {p.templates.map((t,i)=><div className="prompt-card" key={t.id} onFocusCapture={()=>onSelect(t.id)}>
      <div className="prompt-top"><label className="check"><input type="checkbox" checked={t.active} onChange={e=>update(i,n=>{n.templates[i].active=e.target.checked})}/><span>{t.badge} · {t.prompts.length} QUESTIONS</span></label><button onClick={()=>set((x:Project)=>{const n=copy(x);n.templates[i]=copy(defaultTemplates[i]);return n})}><RotateCcw/> Restore category</button></div>
      <Field label="Card headline" value={t.title} onChange={v=>update(i,n=>{n.templates[i].title=v})} wide/>
      <Field label="Category purpose" value={t.purpose} onChange={v=>update(i,n=>{n.templates[i].purpose=v})} wide/>
      <div className="question-list">{t.prompts.map((question,q)=><div className="question-row" key={`${t.id}-${q}`}><span>{q+1}</span><textarea rows={2} value={question} onChange={e=>update(i,n=>{n.templates[i].prompts[q]=e.target.value})}/><button title="Remove question" disabled={t.prompts.length===1} onClick={()=>update(i,n=>{n.templates[i].prompts.splice(q,1)})}><Trash2/></button></div>)}</div>
      <button className="add-question" onClick={()=>update(i,n=>{n.templates[i].prompts.push('New question')})}><Plus/> Add question</button>
    </div>)}
  </Section>
}
