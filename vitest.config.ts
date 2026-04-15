import path from 'node:path';
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  resolve: {
    alias: {
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
