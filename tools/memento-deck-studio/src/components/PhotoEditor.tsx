import {useRef} from 'react';
import {ImagePlus,Maximize2,Minimize2,Move,RotateCcw,Trash2} from 'lucide-react';
import type {PhotoState} from '../types';

export function PhotoEditor({photo,onChange}:{photo:PhotoState;onChange:(v:PhotoState)=>void}){
  const drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
  const load=(file?:File)=>{
    if(!file)return;
    if(!/image\/(jpeg|png|webp)/.test(file.type))return alert('Please choose a JPG, PNG, or WEBP image.');
    const reader=new FileReader();
    reader.onload=()=>{const img=new Image();img.onload=()=>onChange({...photo,dataUrl:String(reader.result),width:img.width,height:img.height,zoom:1,x:0,y:0,rotation:0});img.src=String(reader.result)};
    reader.readAsDataURL(file);
  };
  const move=(e:React.PointerEvent)=>{if(!drag.current)return;onChange({...photo,x:drag.current.x+e.clientX-drag.current.px,y:drag.current.y+e.clientY-drag.current.py})};
  const frameRatio=276/176;
  const imageRatio=photo.height?photo.width/photo.height:frameRatio;
  const fillZoom=Math.max(imageRatio/frameRatio,frameRatio/imageRatio);
  return <div className="photo-editor">
    <label className="dropzone"><ImagePlus size={22}/><b>{photo.dataUrl?'Replace couple photo':'Drop or browse for a couple photo'}</b><small>New photos start fully visible and are never cropped automatically.</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>load(e.target.files?.[0])}/></label>
    {photo.dataUrl&&<>
      <div className="crop-editor" onPointerDown={e=>{drag.current={x:photo.x,y:photo.y,px:e.clientX,py:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={move} onPointerUp={()=>drag.current=null} onWheel={e=>{e.preventDefault();onChange({...photo,zoom:Math.max(.5,Math.min(5,photo.zoom+(e.deltaY<0?.05:-.05)))})}}><img src={photo.dataUrl} draggable={false} style={{transform:`translate(${photo.x}px,${photo.y}px) rotate(${photo.rotation}deg) scale(${photo.zoom})`}}/><div className="crop-overlay"/><span><Move/> Drag photo · scroll to zoom</span></div>
      <div className="fit-choice"><button onClick={()=>onChange({...photo,x:0,y:0,zoom:1})}><Minimize2/> Full photo<span>No cropping</span></button><button onClick={()=>onChange({...photo,x:0,y:0,zoom:fillZoom})}><Maximize2/> Fill frame<span>Crop edges</span></button></div>
      <div className="range-row"><span>Zoom</span><input type="range" min=".5" max="5" step=".05" value={photo.zoom} onChange={e=>onChange({...photo,zoom:+e.target.value})}/><output>{photo.zoom.toFixed(2)}×</output></div>
      <div className="range-row"><span>Horizontal</span><input type="range" min="-180" max="180" value={photo.x} onChange={e=>onChange({...photo,x:+e.target.value})}/><output>{Math.round(photo.x)}</output></div>
      <div className="range-row"><span>Vertical</span><input type="range" min="-180" max="180" value={photo.y} onChange={e=>onChange({...photo,y:+e.target.value})}/><output>{Math.round(photo.y)}</output></div>
      <div className="button-row crop-actions"><button onClick={()=>onChange({...photo,rotation:(photo.rotation+90)%360})}><RotateCcw size={14}/> Rotate</button><button className="danger" onClick={()=>onChange({...photo,dataUrl:'',width:0,height:0})}><Trash2 size={14}/> Remove</button></div>
    </>}
  </div>
}
