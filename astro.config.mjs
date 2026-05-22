import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://party-timeline.pages.dev',
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [react(), tailwind({ applyBaseStyles: false })],
});
