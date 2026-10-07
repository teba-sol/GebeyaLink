import path from 'node:path';

import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
      },
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      env,
      testTimeout: 30_000,
      hookTimeout: 60_000,
    },
  };
});
