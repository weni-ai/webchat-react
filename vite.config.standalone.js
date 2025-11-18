import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { resolve } from 'path'

/**
 * Vite configuration for standalone build (UMD for script tag usage)
 * Build with: vite build --config vite.config.standalone.js
 */
export default defineConfig({
  plugins: [react(), cssInjectedByJsPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use 'sass:math';@import "@/styles/variables.scss";`
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/standalone.jsx'),
      name: 'WebChat',
      formats: ['umd'],
      fileName: () => 'webchat.umd.js'
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        inlineDynamicImports: true
      }
    },
    cssCodeSplit: false,
    outDir: 'dist-standalone'
  }
})
