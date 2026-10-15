"use client";
import {eventQrUrl} from "../../../lib/map-presentation";
export function CustomerGuestQr({slug,name}:{slug:string;name:string}){
 const mapUrl=`https://mementohouse.com/map/${encodeURIComponent(slug)}`,guestUrl=eventQrUrl(mapUrl);
 return <span className="customerGuestQr"><a href={guestUrl} target="_blank" rel="noreferrer" aria-label={`Open guest QR view for ${name}`}><img src={`/api/qr?url=${encodeURIComponent(mapUrl)}`} width={96} height={96} loading="lazy" alt={`Guest QR code for ${name}`}/><small>Open guest QR view ↗</small></a><small>Scan with a phone or open in a private browser to test as a guest.</small></span>;
}
