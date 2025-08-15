import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/__tests__/**/*.(js|jsx|ts|tsx)',
      '**/*.(test|spec).(js|jsx|ts|tsx)',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    globals: true,
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['app/**/*.{js,jsx,ts,tsx}', 'components/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'app/**/*.d.ts',
        'app/**/types.ts',
        '**/__tests__/**',
        '**/node_modules/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '~': path.resolve(__dirname, './'),
    },
  },
});
