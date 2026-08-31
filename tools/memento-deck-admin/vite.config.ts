import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base:'/studios/deck-admin/',
  plugins:[react()],
  build:{outDir:'../../public/studios/deck-admin',emptyOutDir:true}
});
