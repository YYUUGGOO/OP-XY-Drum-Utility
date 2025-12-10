import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Custom domain served from root on GitHub Pages
  base: '/',
  plugins: [react()],
  server: {
    port: 5173
  }
});
