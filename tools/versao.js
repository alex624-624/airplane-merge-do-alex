#!/usr/bin/env node
'use strict';
/*
 * Atualiza, dentro de docs/sw.js, a lista de arquivos do jogo e a "impressão digital" de cada um.
 * É isso que faz o site perceber que existe uma versão nova.
 *
 *   node tools/versao.js            usa os arquivos como estão na pasta
 *   node tools/versao.js --staged   usa o que está preparado para o commit (é o que o gancho do git chama)
 *   node tools/versao.js --check    só confere; termina com erro se docs/sw.js estiver desatualizado
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const ROOT = path.join(REPO, 'docs');
const SW = path.join(ROOT, 'sw.js');
const staged = process.argv.includes('--staged');
const check = process.argv.includes('--check');

const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
const skip = (rel) => rel === 'sw.js' || rel.split('/').some((part) => part.startsWith('.'));

function listFolder(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFolder(path.join(dir, entry.name), rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

function listStaged() {
  const text = execFileSync('git', ['ls-files', '-z', '--', 'docs'], { cwd: REPO }).toString('utf8');
  return text.split('\0').filter(Boolean).map((p) => p.slice('docs/'.length));
}

const read = (rel) => (staged
  ? execFileSync('git', ['show', `:docs/${rel}`], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 })
  : fs.readFileSync(path.join(ROOT, rel)));

const files = (staged ? listStaged() : listFolder(ROOT)).filter((rel) => !skip(rel)).sort();
const map = {};
for (const rel of files) map[rel === 'index.html' ? './' : rel] = sha(read(rel));
if (!map['./']) {
  console.error('docs/index.html não encontrado.');
  process.exit(1);
}

const version = sha(JSON.stringify(map)).slice(0, 10);
const block = [
  '// <versao> (bloco gerado por tools/versao.js — não edite à mão)',
  `const VERSION = '${version}';`,
  `const FILES = ${JSON.stringify(map, null, 2)};`,
  '// </versao>',
].join('\n');

const before = fs.readFileSync(SW, 'utf8');
const pattern = /\/\/ <versao>[\s\S]*?\/\/ <\/versao>/;
if (!pattern.test(before)) {
  console.error('Não achei o bloco <versao> em docs/sw.js.');
  process.exit(1);
}
const after = before.replace(pattern, () => block);

if (check) {
  if (after !== before) {
    console.error('docs/sw.js está desatualizado. Rode: npm run versao');
    process.exit(1);
  }
  console.log(`versão ${version} confere (${files.length} arquivos)`);
} else {
  if (after !== before) fs.writeFileSync(SW, after);
  console.log(`versão ${version} (${files.length} arquivos)${after === before ? ' — sem mudanças' : ''}`);
}
