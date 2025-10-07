import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.config.ts',
        'src/**/*.stories.tsx',
        'src/**/index.ts', // Barrel export files
        'src/types/**/*.ts', // Type definition files
        'src/app/apps/**/*.tsx', // Apps pages - presentational UI
        'src/components/apps/**/*.tsx', // Apps components - presentational UI
        'node_modules/**',
      ],
      all: true,
      thresholds: {
        lines: 80,
        functions: 90,
        branches: 85,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/ui': path.resolve(__dirname, './src/components/ui'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/utils': path.resolve(__dirname, './src/lib/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
    },
  },
})
