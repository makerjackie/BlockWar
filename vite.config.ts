import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.resolve(__dirname);

export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(rootDir, 'client/public'),
  build: {
    outDir: path.resolve(rootDir, 'dist/client'),
    emptyOutDir: true,
  },
  resolve: {
    alias: [
      {
        find: 'next-i18next/serverSideTranslations',
        replacement: path.resolve(rootDir, 'src/compat/server-side-translations.ts'),
      },
      {
        find: 'next-i18next',
        replacement: path.resolve(rootDir, 'src/compat/next-i18next.ts'),
      },
      {
        find: 'socket.io-client',
        replacement: path.resolve(rootDir, 'src/compat/socket-io-client.ts'),
      },
      {
        find: 'next/router',
        replacement: path.resolve(rootDir, 'src/compat/next-router.tsx'),
      },
      {
        find: 'next/link',
        replacement: path.resolve(rootDir, 'src/compat/next-link.tsx'),
      },
      {
        find: 'next/image',
        replacement: path.resolve(rootDir, 'src/compat/next-image.tsx'),
      },
      {
        find: 'next/head',
        replacement: path.resolve(rootDir, 'src/compat/next-head.tsx'),
      },
      {
        find: '@',
        replacement: path.resolve(rootDir, 'client'),
      },
      {
        find: '@shared',
        replacement: path.resolve(rootDir, 'src/shared'),
      },
      {
        find: '@worker',
        replacement: path.resolve(rootDir, 'src/worker'),
      },
    ],
  },
  define: {
    'process.env.NEXT_PUBLIC_SERVER_API': JSON.stringify('/api'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
});
