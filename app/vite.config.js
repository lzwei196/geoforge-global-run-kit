import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// base './' = the built page works from any folder on your web server (e.g. https://example.org/dams/).
// The page reads its data from ./data/ next to index.html (in dev: app/public/data).
// deployment.json is page metadata (not the scientific fixture). Dev serves it from public/; the build emits it
// beside index.html. copyPublicDir stays off so a local data/ folder is never copied into dist.
const deployment = readFileSync(new URL('./public/deployment.json', import.meta.url), 'utf8')

function emitDeployment() {
  return {
    name: 'emit-deployment',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'deployment.json', source: deployment })
    },
  }
}

export default defineConfig({
  base: './',
  cacheDir: '.vite-cache',
  plugins: [emitDeployment()],
  build: { outDir: 'dist', emptyOutDir: true, copyPublicDir: false, chunkSizeWarningLimit: 900 },
})
