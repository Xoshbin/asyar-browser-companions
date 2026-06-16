import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';

// Copies manifest.json and icons into dist/ so the build output is a loadable unpacked extension.
function copyManifest(): Plugin {
  return {
    name: 'copy-manifest',
    closeBundle() {
      copyFileSync(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'));
      const iconsDir = resolve(__dirname, 'icons');
      const distIcons = resolve(__dirname, 'dist/icons');
      mkdirSync(distIcons, { recursive: true });
      for (const file of readdirSync(iconsDir)) {
        copyFileSync(resolve(iconsDir, file), resolve(distIcons, file));
      }
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
