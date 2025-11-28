import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ mode }) => {
  const baseConfig = {
    plugins: [react(), svgr()],
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
    }
  }

  if (mode === 'development') {
    return {
      ...baseConfig,
      root: '.',
      server: {
        port: 3000,
        open: true
      }
    }
  }
  

  return {
    ...baseConfig,
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.js'),
        name: 'WeniWebchatTemplateReact',
        formats: ['es', 'cjs'],
        fileName: (format) => `index.${format === 'es' ? 'esm' : 'cjs'}.js`
      },
      rollupOptions: {
        external: ['react', 'react-dom', '@weni/webchat-service'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            '@weni/webchat-service': 'WeniWebchatService'
          }
        }
      }
    }
  }
})

