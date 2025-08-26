import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig(({ mode }) => {
  const envLocal = loadEnv(mode, process.cwd(), '')
  const envRoot = loadEnv(mode, path.resolve(process.cwd(), '..'), '')
  // Include shell environment variables as highest-precedence source for CI/CD
  const envProc = process.env || {}
  const env = { ...envProc, ...envRoot, ...envLocal }

  return {
    plugins: [react()],
    server: {
      https: false,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api/, '/api')
        }
      }
    },
    define: {
      'import.meta.env.VITE_AFFILIATE_HOME_LINK': JSON.stringify(env.VITE_AFFILIATE_HOME_LINK || env.AMAZON_AFFILIATE_LINK_HOME || ''),
      'import.meta.env.VITE_AFFILIATE_CATEGORY_LINK': JSON.stringify(env.VITE_AFFILIATE_CATEGORY_LINK || env.AMAZON_AFFILIATE_LINK_CATEGORY || ''),
      'import.meta.env.AMAZON_AFFILIATE_LINK_HOME': JSON.stringify(env.AMAZON_AFFILIATE_LINK_HOME || ''),
      'import.meta.env.AMAZON_AFFILIATE_LINK_CATEGORY': JSON.stringify(env.AMAZON_AFFILIATE_LINK_CATEGORY || ''),
    }
  }
})
