import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import eslintPlugin from 'vite-plugin-eslint'

export default defineConfig({
  base: '',
  plugins: [solidPlugin(), eslintPlugin()],
  server: {
    port: 8099,
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 128 << 10,
  },
});
