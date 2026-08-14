import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://ONEdart.github.io',
  base: '/ChordUkulele',

  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),

  integrations: [
    tailwind(),
  ],
});