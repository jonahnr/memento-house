"use client";
import {useEffect,useRef,type RefObject} from "react";
export function useModalFocus(ref:RefObject<HTMLElement|null>,open:boolean,onClose:()=>void){
 const close=useRef(onClose);useEffect(()=>{close.current=onClose},[onClose]);
 useEffect(()=>{
  if(!open)return;const previous=document.activeElement as HTMLElement|null;
  const focusable=()=>Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]')||[]);
  focusable()[0]?.focus();const previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";
  const key=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();close.current();return}if(event.key!=="Tab")return;const items=focusable(),first=items[0],last=items[items.length-1];if(!first)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}};
  document.addEventListener("keydown",key);return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener("keydown",key);if(previous?.isConnected)previous.focus()};
 },[open,ref]);
}
