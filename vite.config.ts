import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 4000, assetsInlineLimit: 100000000 },
});
