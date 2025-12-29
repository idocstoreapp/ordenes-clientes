import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [react(), tailwind()],
  server: { port: 4321 },
  adapter: vercel(),
  build: {
    assets: 'assets',
  },
});



