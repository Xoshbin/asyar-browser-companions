import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

// Copies manifest.json into dist/ so the build output is a loadable unpacked extension.
function copyManifest(): Plugin {
  return {
    name: 'copy-manifest',
    closeBundle() {
      copyFileSync(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'));
    },
  };
}

export default defineConfig({
  plugins: [copyManifest()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
      },
    },
    target: 'es2022',
  },
});
