import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      'react-ts-worker/react': './src/react/index.ts',
      'react-ts-worker/react-dom/client': './src/react-dom/client.ts',
      'react-ts-worker/react-dom/server': './src/react-dom/server.ts',
    },
  },
});
