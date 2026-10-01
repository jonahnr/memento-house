"use client";
import {useEffect,useRef} from "react";
export function ParticipationGuideModal({onClose,onViewed}:{onClose:()=>void;onViewed?:()=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),viewed=useRef(false);
 useEffect(()=>{const node=dialog.current;node?.showModal();const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{node?.close();document.body.style.overflow=previous}},[]);
 return <dialog ref={dialog} className="participationGuideModal" aria-label="How to Get More Guests to Participate" onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose()}}><div className="participationModalContent"><header><b>How to Get More Guests to Participate</b><button type="button" className="button light" onClick={onClose} aria-label="Close participation guide">Close ×</button></header><div className="participationModalImage"><img src="/brand/guest-participation-guide.png" alt="How to Get More Guests to Participate: place QR codes in multiple areas; ask your DJ or emcee to announce it; mention Memento Map more than once; send a guest text reminder; ask your wedding party or close family to help." onLoad={()=>{if(!viewed.current){viewed.current=true;void onViewed?.()}}}/></div></div></dialog>
}
