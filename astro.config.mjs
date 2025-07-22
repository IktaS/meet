import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import svelte from '@astrojs/svelte';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  integrations: [tailwind(), svelte()],
  vite: {
    plugins: [Icons({ compiler: 'svelte' })],
  },
});