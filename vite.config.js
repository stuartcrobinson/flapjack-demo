import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { execSync } from 'child_process'

const gitHash = execSync('git rev-parse --short HEAD').toString().trim()
const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**'],
  },
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap'
    }),
    visualizer({
      filename: 'dist/stats.json',
      template: 'raw-data',
      gzipSize: true
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        geo: 'geo.html',
        api: 'api-docs.html',
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'search-algolia': ['algoliasearch/lite', 'react-instantsearch'],
          'search-meilisearch': ['@meilisearch/instant-meilisearch'],
          'search-typesense': ['typesense-instantsearch-adapter']
        }
      }
    },
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(`${gitHash} @ ${timestamp}`)
  }
})