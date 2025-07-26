import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import svelte from '@astrojs/svelte';
import Icons from 'unplugin-icons/vite';
import bunWebSocket from 'astro-bun-websocket';

export default defineConfig({
  adapter: bunWebSocket(),
  integrations: [tailwind(), svelte()],
  vite: {
    plugins: [Icons({ compiler: 'svelte' })],
  },
  port: import.meta.env.PORT || 4321,
});