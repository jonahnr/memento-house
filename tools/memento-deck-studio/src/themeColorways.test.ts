import {describe,expect,it} from 'vitest';
import {palettes,themeColorways,themes} from './data';

const lum=(hex:string)=>{const n=parseInt(hex.slice(1),16);return[n>>16,(n>>8)&255,n&255].map(v=>{const c=v/255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)};
const ratio=(a:string,b:string)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};

describe('theme colorway matrix',()=>{
 it('gives every visual theme nine valid named variants',()=>{for(const id of Object.keys(themes)){const variants=themeColorways[id as keyof typeof themeColorways];expect(variants).toHaveLength(9);expect(new Set(variants.map(v=>v.id)).size).toBe(9);for(const variant of variants)expect(palettes[variant.id]).toBeDefined()}});
 it('keeps every swatch to three distinct valid colors',()=>{for(const palette of Object.values(palettes)){const colors=[palette.background,palette.primary,palette.accent];expect(new Set(colors).size).toBe(3);for(const color of colors)expect(color).toMatch(/^#[0-9a-f]{6}$/i)}});
 it('can produce readable text on every front and back surface',()=>{for(const [theme,variants] of Object.entries(themeColorways))for(const {id} of variants){const p=palettes[id];const darkFront=['moody','celestial'].includes(theme)&&id!=='blackWhite';const surfaces=[darkFront?p.primary:p.background,p.background];for(const surface of surfaces)expect(Math.max(ratio(p.primary,surface),ratio('#111111',surface),ratio('#ffffff',surface))).toBeGreaterThanOrEqual(4.5)}})
});
