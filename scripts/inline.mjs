// Baut aus dist/ eine einzelne, eigenständige HTML-Datei (dist/ascheron.html).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const dir = 'dist';
let html = readFileSync(`${dir}/index.html`, 'utf8');
const assets = readdirSync(`${dir}/assets`);
for (const f of assets) {
  const code = readFileSync(`${dir}/assets/${f}`, 'utf8');
  if (f.endsWith('.js')) {
    html = html.replace(new RegExp(`<script[^>]*src="\\./assets/${f}"[^>]*></script>`),
      () => `<script type="module">${code.replace(/<\/script/g, '<\\/script')}</script>`);
  } else if (f.endsWith('.css')) {
    html = html.replace(new RegExp(`<link[^>]*href="\\./assets/${f}"[^>]*>`), () => `<style>${code}</style>`);
  }
}
writeFileSync(`${dir}/ascheron.html`, html);
console.log('dist/ascheron.html', (html.length / 1024).toFixed(0), 'KB');
