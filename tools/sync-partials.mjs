#!/usr/bin/env node
// Überträgt gemeinsame Blöcke (Header, Footer, Dialoge) von index.html in alle anderen Seiten.
// Aufruf: node tools/sync-partials.mjs [ordner]   (ohne Ordner: Hauptfassung, sonst z. B. v2)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', process.argv[2] || '.');
const source = readFileSync(join(root, 'index.html'), 'utf8');
const blocks = ['header', 'footer', 'dialogs'];
const re = (name) => new RegExp(`([ \\t]*<!-- shared:${name} -->)[\\s\\S]*?(<!-- /shared:${name} -->)`);

const parts = Object.fromEntries(blocks.map((name) => {
  const m = source.match(re(name));
  if (!m) throw new Error(`Block "${name}" fehlt in index.html`);
  return [name, m[0]];
}));

for (const file of readdirSync(root).filter((f) => f.endsWith('.html') && f !== 'index.html')) {
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  let changed = false;
  for (const name of blocks) {
    if (re(name).test(html)) {
      html = html.replace(re(name), () => parts[name].trimStart().replace(/^/, (html.match(re(name))[1].match(/^[ \t]*/)[0])));
      changed = true;
    }
  }
  if (changed) { writeFileSync(path, html); console.log(`aktualisiert: ${file}`); }
}
