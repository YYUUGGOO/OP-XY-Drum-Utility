import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Use repo name so assets load correctly on GitHub Pages
  base: '/OP-XY-Drum-Utility/',
  plugins: [react()],
  server: {
    port: 5173
  }
});
