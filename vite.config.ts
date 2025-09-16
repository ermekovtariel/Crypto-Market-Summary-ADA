import { defineConfig, loadEnv, type ConfigEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig((env: ConfigEnv) => {
  const { mode } = env; 
  const vars = loadEnv(mode, process.cwd(), ''); 
  const API_TARGET = vars.API_TARGET || 'https://user26614.requestly.tech';

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api/proxy': {
          target: API_TARGET,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/proxy/, '/test/api'),
        },
      },
    },
    build: {
      sourcemap: false,
    },
  };
});
