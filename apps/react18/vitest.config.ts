import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    testTimeout: 20000,
    // @mui/x-date-pickers ve @react-querybuilder/material (MUI ikonları üzerinden) ESM build'lerinde
    // dizin import'u var; Node yerine Vite ile dönüştürülmeli
    server: { deps: { inline: [/@mui\/x-date-pickers/, /@react-querybuilder\/material/] } },
  },
});
