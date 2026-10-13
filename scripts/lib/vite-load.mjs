// Load source files of the site from a Node script - JSX, `import.meta.url` assets and all - through a Vite server in middleware
// mode (no port is opened). Call `close()` when done, or the process stays alive.
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export async function startLoader() {
  const server = await createServer({
    root: ROOT,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  return {
    /** Import a module of the site by its path from the project root, e.g. '/src/effects/headerEffects.js'. */
    load: (file) => server.ssrLoadModule(file),
    close: () => server.close(),
  }
}
