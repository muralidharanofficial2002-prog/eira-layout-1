import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      {
        name: 'eira-universal-entry',
        transformIndexHtml: {
          order: 'pre',
          handler(html: string): string {
            return html
              .replace(
                '<!-- EIRA_APP_ENTRY -->',
                '<script type="module" data-eira-vite="true" src="/src/main.tsx"></script>'
              )
              .replace(/<style id="eira-static-styles">[\s\S]*?<\/style>/, '')
              .replace(/<script type="module" id="eira-static-loader">[\s\S]*?<\/script>/, '');
          },
        },
      },
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds, and emits deterministic app-bundle.js / app-bundle.css
      // into public/ and dist/ so static file servers never 404 on main.tsx.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const publicDir = path.resolve(__dirname, 'public');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          const builtAssetsDir = path.resolve(distDir, 'assets');
          if (fs.existsSync(builtAssetsDir)) {
            const files = fs.readdirSync(builtAssetsDir);
            const jsFile = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
            const cssFile = files.find((f) => f.startsWith('index-') && f.endsWith('.css'));

            if (jsFile) {
              const srcJs = path.resolve(builtAssetsDir, jsFile);
              fs.copyFileSync(srcJs, path.resolve(publicDir, 'app-bundle.js'));
              fs.copyFileSync(srcJs, path.resolve(distDir, 'app-bundle.js'));
              const distSrcDir = path.resolve(distDir, 'src');
              fs.mkdirSync(distSrcDir, {recursive: true});
              fs.writeFileSync(path.resolve(distSrcDir, 'main.tsx'), `import '../app-bundle.js';\n`);
              fs.writeFileSync(path.resolve(distDir, 'main.tsx'), `import './app-bundle.js';\n`);
            }
            if (cssFile) {
              const srcCss = path.resolve(builtAssetsDir, cssFile);
              fs.copyFileSync(srcCss, path.resolve(publicDir, 'app-bundle.css'));
              fs.copyFileSync(srcCss, path.resolve(distDir, 'app-bundle.css'));
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
