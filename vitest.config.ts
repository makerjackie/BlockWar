import path from 'node:path';
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  resolve: {
    alias: {
      'next-i18next/serverSideTranslations': path.resolve(
        __dirname,
        'src/compat/server-side-translations.ts'
      ),
      'next-i18next': path.resolve(__dirname, 'src/compat/next-i18next.ts'),
      'socket.io-client': path.resolve(
        __dirname,
        'src/compat/socket-io-client.ts'
      ),
      'next/router': path.resolve(__dirname, 'src/compat/next-router.tsx'),
      'next/link': path.resolve(__dirname, 'src/compat/next-link.tsx'),
      'next/image': path.resolve(__dirname, 'src/compat/next-image.tsx'),
      'next/head': path.resolve(__dirname, 'src/compat/next-head.tsx'),
      '@': path.resolve(__dirname, 'client'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@worker': path.resolve(__dirname, 'src/worker'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.jsonc',
        },
      },
    },
  },
});
