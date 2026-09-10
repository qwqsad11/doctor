import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(async () => {
  const reactImport = await import('@vitejs/plugin-react');
  const react = (reactImport && (reactImport as any).default) || reactImport;

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
