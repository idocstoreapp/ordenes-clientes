import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [react(), tailwind()],
  server: { port: 4321 },
  output: 'server', // Necesario para que funcionen las API routes en Vercel
  adapter: vercel(),
  build: {
    assets: 'assets',
  },
});



