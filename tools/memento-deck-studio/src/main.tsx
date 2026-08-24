import React from 'react';import{createRoot}from'react-dom/client';import'./styles.css';import App from'./App';
const requestedAdmin=new URLSearchParams(location.search).get('mode')==='admin';
const trustedAdminReferrer=document.referrer.includes('/admin/deck-studio');
document.body.classList.add(requestedAdmin&&trustedAdminReferrer?'studio-admin':'studio-demo');
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
