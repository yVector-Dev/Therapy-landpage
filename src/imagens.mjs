// Gera as imagens de compartilhamento (Open Graph, 1200 × 630) listadas por
// src/construir.mjs e os ícones do aplicativo. Precisa do Playwright:
//   npm install --no-save playwright && npx playwright install chromium
// Uso: node src/construir.mjs && node src/imagens.mjs
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(process.env.PLAYWRIGHT_MODULE || '/opt/node-tools/node_modules/playwright');
}

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const LISTA = join(RAIZ, 'src', 'gerado', 'imagens.json');
const PASTA_OG = join(RAIZ, 'docs', 'assets', 'og');
const PASTA_IMG = join(RAIZ, 'src', 'estaticos', 'img');
// As fontes vão embutidas no HTML: a página gerada não pode ler arquivos locais.
const PASTA_FONTES = join(RAIZ, 'src', 'estaticos', 'fontes');
const fonte = (arquivo) => `data:font/woff2;base64,${readFileSync(join(PASTA_FONTES, arquivo)).toString('base64')}`;
const FONTES = {
  serif: fonte('eb-garamond-latin-wght-normal.woff2'),
  serifExt: fonte('eb-garamond-latin-ext-wght-normal.woff2'),
  serifItalico: fonte('eb-garamond-latin-wght-italic.woff2'),
  serifItalicoExt: fonte('eb-garamond-latin-ext-wght-italic.woff2'),
  sans: fonte('source-sans-3-latin-wght-normal.woff2'),
  sansExt: fonte('source-sans-3-latin-ext-wght-normal.woff2'),
};

if (!existsSync(LISTA)) throw new Error('Rode antes: node src/construir.mjs');
const imagens = JSON.parse(readFileSync(LISTA, 'utf8'));
mkdirSync(PASTA_OG, { recursive: true });

const CORES = {
  filosofia: '#8a5a14',
  ciencia: '#1d6a66',
  artes: '#9a3b52',
  sociedade: '#3b4f9a',
  espiritualidade: '#6a6420',
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CORUJA = `<svg viewBox="0 0 48 48" width="56" height="56"><path fill="#8a5a14" d="M11 15.5 9.6 5.8l7.6 5.6Q20.4 10 24 10t6.8 1.4l7.6-5.6-1.4 9.7q3 4.4 3 10.5C40 36.4 32.8 43 24 43S8 36.4 8 26q0-6.1 3-10.5Z"/><circle fill="#f5f2eb" cx="17.6" cy="22" r="6.2"/><circle fill="#f5f2eb" cx="30.4" cy="22" r="6.2"/><circle fill="#1f1b16" cx="17.6" cy="22" r="2.7"/><circle fill="#1f1b16" cx="30.4" cy="22" r="2.7"/><path fill="#1f1b16" d="m24 26.4 2.4 3.4L24 32.6l-2.4-2.8Z"/></svg>`;

const BASE = `
@font-face { font-family: 'EB Garamond'; font-style: normal; font-weight: 400 800; src: url(${FONTES.serif}) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: 'EB Garamond'; font-style: normal; font-weight: 400 800; src: url(${FONTES.serifExt}) format('woff2'); unicode-range: U+0100-02BA, U+1E00-1EFF; }
@font-face { font-family: 'EB Garamond'; font-style: italic; font-weight: 400 800; src: url(${FONTES.serifItalico}) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: 'EB Garamond'; font-style: italic; font-weight: 400 800; src: url(${FONTES.serifItalicoExt}) format('woff2'); unicode-range: U+0100-02BA, U+1E00-1EFF; }
@font-face { font-family: 'Source Sans 3'; font-style: normal; font-weight: 200 900; src: url(${FONTES.sans}) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: 'Source Sans 3'; font-style: normal; font-weight: 200 900; src: url(${FONTES.sansExt}) format('woff2'); unicode-range: U+0100-02BA, U+1E00-1EFF; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body { background: #f5f2eb; color: #1f1b16; font-family: 'Source Sans 3', sans-serif; }
.moldura { position: absolute; inset: 28px; border: 2px solid #d9cfbd; border-radius: 6px; }
.marca { position: absolute; left: 64px; bottom: 52px; display: flex; align-items: center; gap: 14px; font-family: 'EB Garamond', serif; font-size: 34px; font-weight: 500; }
.endereco { position: absolute; right: 64px; bottom: 64px; font-size: 22px; color: #857b6c; font-weight: 600; }
.faixa { position: absolute; left: 28px; top: 28px; bottom: 28px; width: 12px; border-radius: 6px 0 0 6px; }
`;

function html(img, endereco) {
  const d = img.dados;
  const cor = CORES[d.categoria] ?? CORES.filosofia;
  const rodape = `<div class="marca">${CORUJA}Pensapédia</div><div class="endereco">${esc(endereco)}</div>`;

  if (img.tipo === 'site') {
    return `<style>${BASE}
      .aspas { position: absolute; right: 80px; top: -40px; font-family: 'EB Garamond'; font-size: 520px; color: #8a5a14; opacity: .12; line-height: 1; }
      .conteudo { position: absolute; left: 90px; right: 90px; top: 150px; }
      h1 { font-family: 'EB Garamond', serif; font-weight: 500; font-size: 92px; line-height: 1; }
      p { margin-top: 26px; font-size: 38px; color: #5d5549; max-width: 900px; line-height: 1.3; }
    </style><div class="moldura"></div><div class="aspas">“</div>
    <div class="conteudo"><h1>${esc(d.titulo)}</h1><p>${esc(d.slogan.charAt(0).toUpperCase() + d.slogan.slice(1))}</p></div>${rodape}`;
  }

  if (img.tipo === 'artigo') {
    return `<style>${BASE}
      .conteudo { position: absolute; left: 90px; right: 90px; top: 78px; bottom: 140px; display: flex; flex-direction: column; }
      h1 { font-family: 'EB Garamond', serif; font-weight: 500; font-size: 88px; line-height: 1.02; }
      .meta { margin-top: 14px; font-size: 30px; color: #5d5549; font-weight: 600; }
      blockquote { margin-top: auto; font-family: 'EB Garamond', serif; font-style: italic; font-size: 42px; line-height: 1.28; color: #1f1b16; border-left: 5px solid ${cor}; padding-left: 26px; max-height: 196px; overflow: hidden; }
    </style><div class="moldura"></div><div class="faixa" style="background:${cor}"></div>
    <div class="conteudo"><h1>${esc(d.nome)}</h1><p class="meta">${esc(d.datas)} · ${esc(d.area)}</p>${d.citacao ? `<blockquote>“${esc(d.citacao)}”</blockquote>` : ''}</div>${rodape}`;
  }

  // citacao e falsa
  const falsa = img.tipo === 'falsa';
  return `<style>${BASE}
    .conteudo { position: absolute; left: 96px; right: 96px; top: 60px; bottom: 128px; display: flex; align-items: center; }
    #interno { width: 100%; }
    .aspas { position: absolute; left: 52px; top: 8px; font-family: 'EB Garamond'; font-size: 260px; color: ${falsa ? '#a1342f' : '#8a5a14'}; opacity: .22; line-height: 1; }
    .rotulo { font-size: 24px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #a1342f; margin-bottom: 18px; }
    blockquote { font-family: 'EB Garamond', serif; font-style: italic; line-height: 1.22; font-size: 64px; ${falsa ? 'text-decoration: line-through; text-decoration-color: rgba(161,52,47,.55); text-decoration-thickness: 3px; color: #5d5549;' : ''} }
    .autor { margin-top: 26px; font-size: 34px; font-weight: 700; }
    .fonte { margin-top: 4px; font-size: 24px; color: #5d5549; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  </style><div class="moldura"></div><div class="aspas">“</div>
  <div class="conteudo" id="c"><div id="interno">${falsa ? `<p class="rotulo">${esc(d.fonte)}</p>` : ''}<blockquote id="q">${esc(d.texto)}</blockquote>
  <p class="autor">— ${esc(d.nome)}</p>${falsa ? '' : `<p class="fonte">${esc(d.fonte)}</p>`}</div></div>${rodape}`;
}

function icone(tamanho, mascaravel) {
  const pad = mascaravel ? tamanho * 0.2 : tamanho * 0.1;
  return `<style>html,body{margin:0;width:${tamanho}px;height:${tamanho}px;background:#f5f2eb;display:grid;place-items:center}</style>
  <div style="width:${tamanho - pad * 2}px;height:${tamanho - pad * 2}px">${CORUJA.replace('width="56" height="56"', 'width="100%" height="100%"')}</div>`;
}

const config = (await import(pathToFileURL(join(RAIZ, 'src', 'config.mjs')).href)).default;
const endereco = config.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

const navegador = await playwright.chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
await pagina.route(/^https?:/, (r) => r.abort());

let feitas = 0;
for (const img of imagens) {
  const destino = join(PASTA_OG, img.arquivo);
  if (existsSync(destino)) continue;
  await pagina.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html(img, endereco)}</body></html>`);
  await pagina.evaluate(async () => {
    await document.fonts.ready;
    // Diminui a frase até caber na área disponível.
    const caixa = document.getElementById('c');
    const interno = document.getElementById('interno');
    const frase = document.getElementById('q');
    if (!caixa || !interno || !frase) return;
    let tamanho = 64;
    while (interno.offsetHeight > caixa.clientHeight && tamanho > 24) {
      tamanho -= 2;
      frase.style.fontSize = `${tamanho}px`;
    }
  });
  await pagina.screenshot({ path: destino, type: 'jpeg', quality: 80 });
  feitas += 1;
}

const validas = new Set(imagens.map((i) => i.arquivo));
let removidas = 0;
for (const arquivo of readdirSync(PASTA_OG)) {
  if (!validas.has(arquivo)) {
    rmSync(join(PASTA_OG, arquivo));
    removidas += 1;
  }
}

const icones = [
  ['icone-192.png', 192, false],
  ['icone-512.png', 512, false],
  ['icone-mascaravel-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
];
for (const [arquivo, tamanho, mascaravel] of icones) {
  const destino = join(PASTA_IMG, arquivo);
  if (existsSync(destino)) continue;
  await pagina.setViewportSize({ width: tamanho, height: tamanho });
  await pagina.setContent(`<!DOCTYPE html><html><body>${icone(tamanho, mascaravel)}</body></html>`);
  await pagina.screenshot({ path: destino, type: 'png' });
}

await navegador.close();
console.log(`${feitas} imagens geradas, ${removidas} removidas, ${imagens.length} no total.`);
