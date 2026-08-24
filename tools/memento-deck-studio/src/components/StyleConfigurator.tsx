import {RotateCcw} from 'lucide-react';
import {palettes,themeColorways,themes} from '../data';
import type {Project} from '../types';
import {Section} from './Panel';

const typographyPresets={
  default:{name:'Memento House Default',display:'Cormorant Garamond',body:'Georgia',label:'Arial'},
  editorial:{name:'Editorial',display:'Bodoni MT',body:'Garamond',label:'Century Gothic'},
  romantic:{name:'Romantic',display:'Garamond',body:'Book Antiqua',label:'Trebuchet MS'},
  modern:{name:'Modern',display:'Georgia',body:'Trebuchet MS',label:'Verdana'}
};

export function StyleConfigurator({project:p,setProject:set}:{project:Project;setProject:any}){
  const activePalette=p.settings.paletteId==='custom'?p.settings.customPalette:palettes[p.settings.paletteId];
  const font=(role:'display'|'body'|'label',value:string)=>set((x:Project)=>({...x,settings:{...x.settings,fonts:{...x.settings.fonts,[role]:value}}}));
  const applyPreset=(id:keyof typeof typographyPresets)=>{const {display,body,label}=typographyPresets[id];set((x:Project)=>({...x,settings:{...x.settings,fonts:{display,body,label}}}))};
  return <Section title="Collection style" eyebrow="STEP 3">
    <p className="hint">Choose a complete visual direction, then keep the default typography or customize it.</p>
    <h3>Visual theme</h3>
    <div className="choice-grid theme-picker">{Object.entries(themes).map(([id,t])=><button key={id} className={p.settings.theme===id?'active':''} onClick={()=>set((x:Project)=>({...x,settings:{...x.settings,theme:id,paletteId:themeColorways[id as keyof typeof themeColorways][0].id,textColor:undefined,frontTextColor:undefined,backTextColor:undefined}}))}><span className={`theme-swatch ${t.className}`}><i/><b>Aa</b></span><strong>{t.label}</strong></button>)}</div>
    <h3>{themes[p.settings.theme].label} variants</h3>
    <p className="hint">These color treatments are curated for the selected visual theme. Changing one keeps its layout and artwork intact.</p>
    <div className="palette-grid theme-variants">{themeColorways[p.settings.theme].map(({id,name})=>{const v=palettes[id];return <button key={id} className={p.settings.paletteId===id?'active':''} onClick={()=>set((x:Project)=>({...x,settings:{...x.settings,paletteId:id,textColor:undefined,frontTextColor:undefined,backTextColor:undefined}}))}><span style={{background:v.background}}/><span style={{background:v.primary}}/><span style={{background:v.accent}}/><b>{name}</b></button>})}</div>
    <div className="contrast-controls"><h3>Front & back contrast</h3><p className="hint">Automatic calculates contrast separately for each side. Override either side only when you want a specific ink color.</p><button className="auto-contrast" onClick={()=>set((x:Project)=>({...x,settings:{...x.settings,frontTextColor:undefined,backTextColor:undefined,textColor:undefined}}))}>Use automatic contrast on both sides</button><label className="color-control"><span>Front text</span><input type="color" value={p.settings.frontTextColor||activePalette.primary} onChange={e=>set((x:Project)=>({...x,settings:{...x.settings,frontTextColor:e.target.value}}))}/><code>{p.settings.frontTextColor||'Auto'}</code></label><label className="color-control"><span>Back text</span><input type="color" value={p.settings.backTextColor||activePalette.primary} onChange={e=>set((x:Project)=>({...x,settings:{...x.settings,backTextColor:e.target.value}}))}/><code>{p.settings.backTextColor||'Auto'}</code></label></div>
    <h3>Typography</h3>
    <label><span>Typography preset</span><select onChange={e=>applyPreset(e.target.value as keyof typeof typographyPresets)} defaultValue="default">{Object.entries(typographyPresets).map(([id,v])=><option key={id} value={id}>{v.name}</option>)}</select></label>
    <button className="default-type" onClick={()=>applyPreset('default')}><RotateCcw/> Restore Memento House default</button>
    <details className="advanced-type"><summary>Customize individual fonts</summary><div className="type-controls"><label><span>Names & display</span><select value={p.settings.fonts.display} onChange={e=>font('display',e.target.value)}>{['Cormorant Garamond','Georgia','Baskerville','Garamond','Palatino Linotype','Book Antiqua','Didot','Bodoni MT','Times New Roman'].map(x=><option key={x}>{x}</option>)}</select></label><label><span>Stories & prompts</span><select value={p.settings.fonts.body} onChange={e=>font('body',e.target.value)}>{['Georgia','Garamond','Palatino Linotype','Book Antiqua','Cambria','Times New Roman','Arial','Trebuchet MS'].map(x=><option key={x}>{x}</option>)}</select></label><label><span>Labels & numbers</span><select value={p.settings.fonts.label} onChange={e=>font('label',e.target.value)}>{['Arial','DM Sans','Trebuchet MS','Verdana','Tahoma','Gill Sans','Century Gothic'].map(x=><option key={x}>{x}</option>)}</select></label></div></details>
    <div className="type-note">Long names and prompt copy automatically scale down inside the printable safe area.</div>
    <div className="toggle-row"><span>Memento House branding</span><button className={p.settings.showBranding?'switch on':'switch'} onClick={()=>set((x:Project)=>({...x,settings:{...x.settings,showBranding:!x.settings.showBranding}}))}><i/></button></div>
    <label><span>Writing lines</span><select value={p.settings.writingLines} onChange={e=>set((x:Project)=>({...x,settings:{...x.settings,writingLines:e.target.value}}))}><option value="none">None</option><option value="light">Light lines</option><option value="dotted">Dotted lines</option></select></label>
  </Section>
}
