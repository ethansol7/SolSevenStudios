import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/SolSevenStudios/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
