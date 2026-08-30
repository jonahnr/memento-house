import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects(){return[
    {source:"/unity-tile",destination:"/unity-tile-signature-board",permanent:true},
    {source:"/unity-tile-guestbook",destination:"/unity-tile-signature-board",permanent:true},
    {source:"/memento-map-demo",destination:"/map/jonah-kate",permanent:true},
    {source:"/favicon.ico",destination:"/brand/memento-house-logo.webp",permanent:false},
  ]},
};

export default nextConfig;
