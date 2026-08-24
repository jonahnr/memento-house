import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base:'/studios/deck/',
  plugins:[react()],
  build:{outDir:'../../public/studios/deck',emptyOutDir:true}
});
