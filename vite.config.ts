// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative asset URLs so Electron can load the built app via file://
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5173 }
});
