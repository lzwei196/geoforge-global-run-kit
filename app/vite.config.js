import { defineConfig } from 'vite'

// base './' = the built page works from any folder on your web server (e.g. https://example.org/dams/).
// The page reads its data from ./data/ next to index.html (in dev: app/public/data).
export default defineConfig({
  base: './',
  cacheDir: '.vite-cache',
  build: { outDir: 'dist', emptyOutDir: true, copyPublicDir: false, chunkSizeWarningLimit: 900 },
})
