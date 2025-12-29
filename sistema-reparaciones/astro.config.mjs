import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  server: { port: 4321 },
  output: 'static',
  build: {
    assets: 'assets',
  },
});

