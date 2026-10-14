/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    open: true
  },
  // @ts-expect-error vitest config
  test: {
    globals: true,
    environment: 'node',
  }
});
