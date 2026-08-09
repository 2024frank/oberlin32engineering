import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.oberlin32engineeringsociety.com',
  srcDir: './app',
  publicDir: './public',
  outDir: './site',
  build: {
    format: 'file',
    assets: 'assets/build',
  },
  compressHTML: true,
  vite: {
    build: {
      target: 'es2022',
    },
  },
});
