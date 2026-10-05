// Gera o site estático da Pensapédia na pasta docs/.
// Uso: node src/construir.mjs
// Não depende de nenhum pacote externo: basta ter o Node.js 18 ou mais novo.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import config from './config.mjs';
import livros from './conteudo/livros.mjs';
import uiPt from './idiomas/pt.mjs';
import uiEn from './idiomas/en.mjs';
import uiEs from './idiomas/es.mjs';
import { conteudo as conteudoPt } from './conteudo/pt/index.mjs';
import { conteudo as conteudoEn } from './conteudo/en/index.mjs';
import { conteudo as conteudoEs } from './conteudo/es/index.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, 'docs');
const ESTATICOS = join(RAIZ, 'src', 'estaticos');

const UI = { pt: uiPt, en: uiEn, es: uiEs };
const CONTEUDO = { pt: conteudoPt, en: conteudoEn, es: conteudoEs };
const IDIOMAS = config.idiomas.filter((l) => UI[l] && CONTEUDO[l]?.length);
const URL_SITE = config.url.replace(/\/+$/, '');
const ANO = Number(config.atualizado.slice(0, 4));

// Campos que não mudam de um idioma para outro: vêm do conteúdo em português.
const COMPARTILHADOS = ['ano', 'categorias', 'wikiEn', 'nomeOriginal', 'nomeOriginalLang', 'verTambem'];

// ---------------------------------------------------------------- utilidades
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const semTags = (s) => String(s ?? '').replace(/<[^>]+>/g, '');
const slug = (s) => semTags(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hash = (s, n = 10) => createHash('sha1').update(s).digest('hex').slice(0, n);
const formatar = (modelo, vars = {}) => modelo.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
const trecho = (texto, max) => {
  const t = semTags(texto);
  if (t.length <= max) return t;
  return `${t.slice(0, t.lastIndexOf(' ', max)).replace(/[,;:.!?—–-]+$/, '')}…`;
};

function recuar(html, espacos) {
  const pad = ' '.repeat(espacos);
  const linhas = String(html).replace(/^\n+|\s+$/g, '').split('\n');
  const minimo = Math.min(...linhas.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return linhas.map((l) => (l.trim() ? pad + l.slice(minimo).trimEnd() : '')).join('\n');
}

function escrever(caminho, conteudo) {
  const arquivo = caminho === '' || caminho.endsWith('/') ? join(SAIDA, caminho, 'index.html') : join(SAIDA, caminho);
  mkdirSync(dirname(arquivo), { recursive: true });
  writeFileSync(arquivo, conteudo);
}

// ---------------------------------------------------------------- dados por idioma
const base = new Map(conteudoPt.map((p) => [p.id, p]));

const SITE = {};
for (const lang of IDIOMAS) {
  const ui = UI[lang];
  const ids = new Set(CONTEUDO[lang].map((p) => p.id));
  for (const id of base.keys()) if (!ids.has(id)) throw new Error(`${lang}: falta a personalidade ${id}`);

  const pessoas = CONTEUDO[lang].map((p) => {
    const b = base.get(p.id);
    if (!b) throw new Error(`${lang}: personalidade desconhecida ${p.id}`);
    const compartilhado = Object.fromEntries(COMPARTILHADOS.map((k) => [k, b[k]]));
    const pessoa = { ...compartilhado, ...p };
    pessoa.slug = p.slug ?? slug(p.nome);
    pessoa.wikiLocal = lang === 'pt' ? b.wikiPt : lang === 'en' ? b.wikiEn : p.wiki;
    for (const campo of ['nome', 'datas', 'area', 'resumo', 'infobox', 'lead', 'corpo', 'citacoes']) {
      if (pessoa[campo] === undefined) throw new Error(`${lang}/${p.id}: falta o campo ${campo}`);
    }
    for (const c of pessoa.citacoes) if (c.tema && !ui.temas[c.tema]) throw new Error(`${lang}/${p.id}: tema ${c.tema}`);
    return pessoa;
  }).sort((a, b) => a.ano - b.ano);

  const porId = new Map(pessoas.map((p) => [p.id, p]));

  // Citações (e atribuições incorretas) ganham página própria.
  const usados = new Set();
  const citacoes = [];
  for (const p of pessoas) {
    const lista = [
      ...p.citacoes.map((c) => ({ ...c, falsa: false })),
      ...(p.apocrifas ?? []).map((c) => ({ ...c, falsa: true })),
    ];
    for (const c of lista) {
      let s = p.slug;
      let n = 0;
      for (const palavra of slug(c.texto).split('-').filter(Boolean)) {
        if (n === 9 || `${s}-${palavra}`.length > 80) break;
        s += `-${palavra}`;
        n += 1;
      }
      // Não termina o endereço em artigo, preposição ou conjunção.
      const soltas = new Set(['a', 'o', 'e', 'de', 'do', 'da', 'que', 'em', 'um', 'uma', 'os', 'as', 'no', 'na', 'se', 'por', 'para', 'com', 'nao',
        'the', 'of', 'and', 'to', 'in', 'is', 'it', 'that', 'for', 'an', 'el', 'la', 'los', 'las', 'y', 'en', 'del', 'un', 'una', 'con', 'no', 'es']);
      const partes = s.split('-');
      while (partes.length > p.slug.split('-').length + 2 && soltas.has(partes[partes.length - 1])) partes.pop();
      s = partes.join('-');
      while (usados.has(s)) s += '-2';
      usados.add(s);
      citacoes.push({ ...c, autor: p.id, slug: s, indice: citacoes.length });
    }
  }
  SITE[lang] = { ui, pessoas, porId, citacoes };
}

// ---------------------------------------------------------------- caminhos
const R = (lang) => UI[lang].rotas;
const caminhos = {
  inicio: (lang) => `${lang}/`,
  lista: (lang) => `${lang}/${R(lang).pessoas}/`,
  artigo: (lang, id) => `${lang}/${R(lang).pessoas}/${SITE[lang].porId.get(id).slug}/`,
  citacao: (lang, c) => `${lang}/${R(lang).citacoes}/${c.slug}/`,
  pagina: (lang, nome) => `${lang}/${R(lang)[nome]}/`,
};
const absoluto = (caminho) => `${URL_SITE}/${caminho}`;
const profundidade = (caminho) => caminho.split('/').filter(Boolean).length - (caminho.endsWith('/') ? 0 : 1);

// ---------------------------------------------------------------- estáticos
// Limpa a saída, preservando as imagens de compartilhamento já geradas.
mkdirSync(SAIDA, { recursive: true });
for (const item of readdirSync(SAIDA)) {
  if (item !== 'assets') rmSync(join(SAIDA, item), { recursive: true, force: true });
}
if (existsSync(join(SAIDA, 'assets'))) {
  for (const item of readdirSync(join(SAIDA, 'assets'))) {
    if (item !== 'og') rmSync(join(SAIDA, 'assets', item), { recursive: true, force: true });
  }
}

const ASSETS = join(SAIDA, 'assets');
cpSync(join(ESTATICOS, 'js'), join(ASSETS, 'js'), { recursive: true });
cpSync(join(ESTATICOS, 'img'), join(ASSETS, 'img'), { recursive: true });
cpSync(join(ESTATICOS, 'fontes'), join(ASSETS, 'fontes'), { recursive: true });
mkdirSync(join(ASSETS, 'css'), { recursive: true });
writeFileSync(
  join(ASSETS, 'css', 'estilo.css'),
  `${readFileSync(join(ESTATICOS, 'css', 'fontes.css'), 'utf8')}\n${readFileSync(join(ESTATICOS, 'css', 'estilo.css'), 'utf8')}`,
);
writeFileSync(join(SAIDA, '.nojekyll'), '');

const versao = {};
const comVersao = (rel) => {
  if (!versao[rel]) versao[rel] = hash(readFileSync(join(SAIDA, rel)), 8);
  return `${rel}?v=${versao[rel]}`;
};

// ---------------------------------------------------------------- imagens de compartilhamento
// Cada página aponta para uma imagem cujo nome depende do conteúdo. O script
// src/imagens.mjs gera as que faltam (usa o Chromium do Playwright).
const imagensOG = [];
function imagemOG(lang, tipo, dados) {
  const arquivo = `${lang}-${tipo}-${hash(JSON.stringify({ tipo, dados }))}.jpg`;
  imagensOG.push({ arquivo, tipo, lang, dados });
  return `assets/og/${arquivo}`;
}

// ---------------------------------------------------------------- peças comuns
const ICONES = {
  coruja: `<svg class="coruja" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path class="coruja-corpo" d="M11 15.5 9.6 5.8l7.6 5.6Q20.4 10 24 10t6.8 1.4l7.6-5.6-1.4 9.7q3 4.4 3 10.5C40 36.4 32.8 43 24 43S8 36.4 8 26q0-6.1 3-10.5Z"/><circle class="coruja-olho" cx="17.6" cy="22" r="6.2"/><circle class="coruja-olho" cx="30.4" cy="22" r="6.2"/><circle class="coruja-pupila" cx="17.6" cy="22" r="2.7"/><circle class="coruja-pupila" cx="30.4" cy="22" r="2.7"/><path class="coruja-bico" d="m24 26.4 2.4 3.4L24 32.6l-2.4-2.8Z"/><path class="coruja-penas" d="M17.5 36.2q3.25 2.2 6.5 0 3.25 2.2 6.5 0"/></svg>`,
  lupa: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
  lua: '<svg class="icone icone-lua" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>',
  sol: '<svg class="icone icone-sol" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
  globo: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  girar: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4.5V11h-6.5"/></svg>',
  copiar: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>',
  compartilhar: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>',
  link: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  imagem: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-8.5 8.5"/></svg>',
  livro: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  externo: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};

const inicial = (nome) => nome.replace(/^(Santo|São|Santa|San|Saint)\s+/, '').charAt(0);

function retrato(p, tamanho) {
  return `<span class="retrato retrato-${tamanho}" data-wiki="${esc(p.wikiEn)}" data-categoria="${p.categorias[0]}" data-nome="${esc(p.nome)}"><span class="monograma" aria-hidden="true">${inicial(p.nome)}</span></span>`;
}

function selo(lang, rotulo) {
  return rotulo ? ` <span class="selo">${UI[lang].rotulos[rotulo] ?? rotulo}</span>` : '';
}

function anuncio(bloco) {
  const a = config.anuncios;
  if (!a.ativo || !a.cliente || !a.blocos[bloco]) return '';
  return `<aside class="anuncio" data-rotulo="{publicidade}">
  <ins class="adsbygoogle" style="display:block" data-ad-client="${esc(a.cliente)}" data-ad-slot="${esc(a.blocos[bloco])}" data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</aside>`;
}

function newsletter(lang) {
  if (!config.newsletter.acao) return '';
  const t = UI[lang].t;
  return `<section class="caixa-newsletter" aria-labelledby="newsletter-titulo">
  <h2 id="newsletter-titulo">${t.newsTitulo}</h2>
  <p>${t.newsTexto}</p>
  <form action="${esc(config.newsletter.acao)}" method="post" target="_blank" rel="noopener">
    <label class="visualmente-oculto" for="newsletter-email">${t.newsRotulo}</label>
    <input id="newsletter-email" type="email" name="${esc(config.newsletter.campo)}" placeholder="${t.newsPlaceholder}" autocomplete="email" required>
    <input type="hidden" name="tag" value="${lang}">
    <button class="botao" type="submit">${t.newsBotao}</button>
  </form>
</section>`;
}

function apoio(lang) {
  if (!config.apoio) return '';
  const t = UI[lang].t;
  return `<section class="caixa-apoio">
  <div>
    <h2>${t.apoioTitulo}</h2>
    <p>${t.apoioTexto}</p>
  </div>
  <a class="botao" href="${esc(config.apoio)}" rel="noopener" target="_blank">${t.apoioBotao}</a>
</section>`;
}

function trilha(lang, raiz, itens) {
  const t = UI[lang].t;
  const html = itens.map(([texto, caminho], i) => (i === itens.length - 1
    ? `<li><span aria-current="page">${texto}</span></li>`
    : `<li><a href="${raiz}${caminho}">${texto}</a></li>`)).join('');
  return `<nav class="trilha" aria-label="${t.trilha}"><ol>${html}</ol></nav>`;
}

function jsonTrilha(itens) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: itens.map(([texto, caminho], i) => ({
      '@type': 'ListItem', position: i + 1, name: semTags(texto), item: absoluto(caminho),
    })),
  };
}

const organizacao = () => ({
  '@type': 'Organization',
  name: 'Pensapédia',
  url: `${URL_SITE}/`,
  logo: { '@type': 'ImageObject', url: absoluto('assets/img/icone-512.png') },
});

// ---------------------------------------------------------------- documento
function documento(o) {
  const { lang, caminho, titulo, descricao, corpo } = o;
  const ui = UI[lang];
  const t = ui.t;
  const raiz = '../'.repeat(profundidade(caminho));
  const nav = (chave, alvo, texto) => `<a href="${raiz}${alvo}"${o.ativo === chave ? ' aria-current="page"' : ''}>${texto}</a>`;
  const alternativos = o.alternativos ?? {};
  const og = o.og ?? imagemOG(lang, 'site', { titulo: t.tituloMural, slogan: ui.sloganLongo });

  const hreflang = Object.keys(alternativos).length
    ? [
      ...IDIOMAS.filter((l) => alternativos[l]).map((l) => `  <link rel="alternate" hreflang="${UI[l].hreflang}" href="${absoluto(alternativos[l])}">`),
      `  <link rel="alternate" hreflang="x-default" href="${absoluto(o.xDefault ?? alternativos[IDIOMAS[0]] ?? caminho)}">`,
    ].join('\n')
    : '';

  const idiomas = IDIOMAS.map((l) => {
    const alvo = alternativos[l] ?? caminhos.inicio(l);
    return `<li><a href="${raiz}${alvo}" hreflang="${UI[l].hreflang}" lang="${UI[l].html}" data-idioma="${l}"${l === lang ? ' aria-current="true"' : ''}>${UI[l].nome}</a></li>`;
  }).join('');

  const scriptsTerceiros = [
    config.analytics.plausible ? `<script defer data-domain="${esc(config.analytics.plausible)}" src="https://plausible.io/js/script.js"></script>` : '',
    config.analytics.cloudflare ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(config.analytics.cloudflare)}"}'></script>` : '',
    config.anuncios.ativo && config.anuncios.cliente ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.anuncios.cliente)}" crossorigin="anonymous"></script>` : '',
  ].filter(Boolean).map((s) => `  ${s}`).join('\n');

  const jsonld = o.jsonld ? `  <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': o.jsonld }).replace(/</g, '\\u003c')}</script>` : '';

  const rodapeLinks = [
    nav('', caminhos.inicio(lang), t.inicio),
    nav('', caminhos.lista(lang), t.pessoas),
    `<a href="${raiz}${caminhos.lista(lang)}" data-aleatorio>${t.artigoAleatorio}</a>`,
    nav('', caminhos.pagina(lang, 'sobre'), t.sobre),
    nav('', caminhos.pagina(lang, 'privacidade'), t.privacidade),
    nav('', caminhos.pagina(lang, 'termos'), t.termos),
    config.apoio ? `<a href="${esc(config.apoio)}" rel="noopener" target="_blank">${t.apoie}</a>` : '',
  ].filter(Boolean).join('\n          ');

  const html = `<!DOCTYPE html>
<html lang="${ui.html}" class="sem-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(descricao)}">
  <link rel="canonical" href="${absoluto(caminho)}">
${hreflang}
  <meta property="og:site_name" content="${ui.site}">
  <meta property="og:title" content="${esc(o.tituloSocial ?? titulo)}">
  <meta property="og:description" content="${esc(descricao)}">
  <meta property="og:type" content="${o.tipo ?? 'website'}">
  <meta property="og:url" content="${absoluto(caminho)}">
  <meta property="og:image" content="${absoluto(og)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="${ui.ogLocale}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#fffdf9" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1c1915" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="${raiz}assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${raiz}assets/img/apple-touch-icon.png">
  <link rel="manifest" href="${raiz}manifest.webmanifest">
  <link rel="preload" href="${raiz}assets/fontes/source-sans-3-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${raiz}assets/fontes/eb-garamond-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${raiz}${comVersao('assets/css/estilo.css')}">
  <script>document.documentElement.className='js';try{var t=localStorage.getItem('pensapedia:tema');if(t==='claro'||t==='escuro')document.documentElement.dataset.tema=t}catch(e){}</script>
${scriptsTerceiros}
${jsonld}
</head>
<body data-raiz="${raiz}" data-idioma="${lang}" data-pagina="${o.pagina}"${o.pessoa ? ` data-pessoa="${o.pessoa}"` : ''}>
  <a class="pular" href="#conteudo">${t.pular}</a>

  <header class="topo" id="topo">
    <div class="topo-interno">
      <a class="marca" href="${raiz}${caminhos.inicio(lang)}">
        ${ICONES.coruja}
        <span class="marca-texto">
          <span class="marca-nome">${ui.site}</span>
          <span class="marca-slogan">${ui.slogan}</span>
        </span>
      </a>

      <form class="busca" role="search" action="${raiz}${caminhos.lista(lang)}" method="get">
        <label class="visualmente-oculto" for="busca-campo">${t.buscaRotulo}</label>
        ${ICONES.lupa}
        <input id="busca-campo" name="q" type="search" placeholder="${t.buscaPlaceholder}" autocomplete="off"
               role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="busca-sugestoes">
        <ul id="busca-sugestoes" class="busca-sugestoes" role="listbox" aria-label="${t.sugestoes}" hidden></ul>
      </form>

      <nav class="nav-principal" aria-label="${t.navPrincipal}">
        ${nav('inicio', caminhos.inicio(lang), t.inicio)}
        ${nav('lista', caminhos.lista(lang), t.pessoas)}
        <a href="${raiz}${caminhos.lista(lang)}" data-aleatorio>${t.aleatorio}</a>
      </nav>

      <details class="idiomas">
        <summary title="${t.idioma}">${ICONES.globo}<span class="visualmente-oculto">${t.idioma}: </span><span class="idiomas-atual">${lang.toUpperCase()}</span></summary>
        <ul>${idiomas}</ul>
      </details>

      <button class="botao-tema" type="button" aria-label="${t.alternarTema}" title="${t.alternarTema}">
        ${ICONES.lua}${ICONES.sol}
      </button>
    </div>
  </header>

${corpo.replace(/\{publicidade\}/g, t.publicidade)}

  <footer class="rodape">
    <div class="rodape-interno">
      <a class="rodape-marca" href="${raiz}${caminhos.inicio(lang)}">${ICONES.coruja} ${ui.site}</a>
      <nav class="rodape-nav" aria-label="${t.navRodape}">
          ${rodapeLinks}
      </nav>
      <ul class="rodape-idiomas" aria-label="${t.idioma}">${idiomas}</ul>
      <p class="rodape-nota">${t.rodapeNota}${config.afiliados[lang]?.tag ? ` ${t.divulgacao}` : ''}</p>
      <p class="rodape-nota">© ${ANO} ${ui.site}</p>
    </div>
  </footer>

  <script src="${raiz}${comVersao(`assets/js/dados-${lang}.js`)}"></script>
  <script src="${raiz}${comVersao('assets/js/site.js')}"></script>
${(o.scripts ?? []).map((s) => `  <script src="${raiz}${comVersao(`assets/js/${s}`)}"></script>`).join('\n')}
</body>
</html>
`;
  escrever(caminho, html.replace(/\n{3,}/g, '\n\n').replace(/\n\n(\s*<\/head>)/, '\n$1'));
}

// ---------------------------------------------------------------- artigo
function linkLivro(lang, p, livro) {
  const titulo = livro.titulo[lang];
  const autor = livro.autor?.[lang] ?? p.nome;
  const loja = config.afiliados[lang] ?? config.afiliados.en;
  const url = new URL(loja.loja);
  url.searchParams.set('k', `${titulo} ${autor}`);
  if (loja.tag) url.searchParams.set('tag', loja.tag);
  const rel = loja.tag ? 'sponsored noopener' : 'noopener';
  return `<li><a href="${esc(url.toString())}" rel="${rel}" target="_blank">${ICONES.livro}<span><i>${titulo}</i><small>${autor}</small></span></a></li>`;
}

function paginaArtigo(lang, p) {
  const { ui, porId, citacoes } = SITE[lang];
  const t = ui.t;
  const caminho = caminhos.artigo(lang, p.id);
  const raiz = '../'.repeat(profundidade(caminho));
  const wiki = (html) => html.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, texto) => {
    const o = porId.get(id);
    if (!o) throw new Error(`${lang}/${p.id}: link interno inválido ${id}`);
    return `<a href="${raiz}${caminhos.artigo(lang, id)}">${texto ?? o.nome}</a>`;
  });

  const usados = new Set();
  const cabecalho = (nivel, titulo, id) => {
    let i = id ?? slug(titulo);
    while (usados.has(i)) i += '-2';
    usados.add(i);
    return `<h${nivel} id="${i}">${titulo}</h${nivel}>`;
  };

  let corpo = wiki(p.corpo).replace(/<h([23])>(.*?)<\/h\1>/g, (_, n, tt) => cabecalho(Number(n), tt));
  // Anúncio antes da segunda seção, quando ativado.
  const bloco = anuncio('artigo');
  if (bloco) {
    let n = 0;
    corpo = corpo.replace(/<h2 /g, (m) => (++n === 2 ? `${bloco}\n\n${m}` : m));
  }

  const minhas = citacoes.filter((c) => c.autor === p.id);
  const itemCitacao = (c) => `<li>
  <blockquote><p>${c.texto}</p></blockquote>
  <p class="citacao-fonte">— ${c.fonte}${selo(lang, c.rotulo)}${c.nota ? `<span class="citacao-nota">${c.nota}</span>` : ''}</p>
  <a class="citacao-link" href="${raiz}${caminhos.citacao(lang, c)}">${ICONES.link}${t.abrirCitacao}</a>
</li>`;
  corpo += `\n\n${cabecalho(2, t.citacoes, 'citacoes')}\n<ul class="citacoes">\n${minhas.filter((c) => !c.falsa).map(itemCitacao).join('\n').replace(/^/gm, '  ')}\n</ul>`;
  const falsas = minhas.filter((c) => c.falsa);
  if (falsas.length) {
    corpo += `\n${cabecalho(3, t.atribuicoesIncorretas, 'atribuicoes-incorretas')}
<p class="hatnote">${formatar(t.hatnoteApocrifas, { nome: p.nome })}</p>
<ul class="citacoes citacoes-apocrifas">
${falsas.map((c) => `<li>
  <blockquote><p>${c.texto}</p></blockquote>
  <p class="citacao-fonte">${c.nota}</p>
  <a class="citacao-link" href="${raiz}${caminhos.citacao(lang, c)}">${ICONES.link}${t.abrirCitacao}</a>
</li>`).join('\n').replace(/^/gm, '  ')}
</ul>`;
  }

  const meusLivros = livros[p.id] ?? [];
  if (meusLivros.length) {
    corpo += `\n\n${cabecalho(2, t.leituras, 'leituras')}
<p>${formatar(t.leiturasIntro, { nome: p.nome })}</p>
<ul class="leituras">
${meusLivros.map((l) => `  ${linkLivro(lang, p, l)}`).join('\n')}
</ul>${config.afiliados[lang]?.tag ? `\n<p class="divulgacao">${t.divulgacao}</p>` : ''}`;
  }

  corpo += `\n\n${cabecalho(2, t.verTambem, 'ver-tambem')}\n<ul class="ver-tambem">\n${p.verTambem.map((id) => {
    const o = porId.get(id);
    // Em inglês, nacionalidades começam com maiúscula ("Greek philosopher").
    const area = lang === 'en' ? o.area : `${o.area.charAt(0).toLowerCase()}${o.area.slice(1)}`;
    return `  <li><a href="${raiz}${caminhos.artigo(lang, id)}">${o.nome}</a> <span>— ${area} (${o.datas})</span></li>`;
  }).join('\n')}\n</ul>`;

  const wikiUrl = `https://${lang}.wikipedia.org/w/index.php?search=${encodeURIComponent(p.wikiLocal)}&go=Go`;
  corpo += `\n\n${cabecalho(2, t.ligacoesExternas, 'ligacoes-externas')}
<ul class="externas">
  <li><a href="${esc(wikiUrl)}" rel="noopener" target="_blank">${formatar(t.naWikipedia, { titulo: p.wikiLocal })}</a></li>
</ul>`;

  const infobox = p.infobox.map(([rotulo, valor]) => `<tr><th scope="row">${rotulo}</th><td>${wiki(valor)}</td></tr>`).join('\n');
  const itensTrilha = [[t.inicio, caminhos.inicio(lang)], [t.pessoas, caminhos.lista(lang)], [p.nome, caminho]];
  const destaque = minhas.find((c) => c.tema && !c.falsa) ?? minhas[0];
  const og = imagemOG(lang, 'artigo', {
    nome: p.nome, datas: p.datas, area: p.area, citacao: destaque ? semTags(destaque.texto) : '', categoria: p.categorias[0],
  });

  const conteudo = `  <div class="artigo-layout">
    <aside class="indice-lateral" data-indice-lateral></aside>

    <main id="conteudo" class="artigo" tabindex="-1">
      ${trilha(lang, raiz, itensTrilha)}
      <header class="artigo-cabecalho">
        <h1>${p.nome}</h1>
        <p class="origem">${t.origem}</p>
      </header>

      <aside class="infobox" aria-label="${esc(formatar(t.fichaDe, { nome: p.nome }))}">
        <p class="infobox-titulo">${p.nomeCompleto ?? p.nome}</p>
${p.nomeOriginal ? `        <p class="infobox-original" lang="${p.nomeOriginalLang ?? ''}">${p.nomeOriginal}</p>\n` : ''}        <figure class="infobox-retrato">
          ${retrato(p, 'grande')}
          <figcaption>${p.legenda ?? p.nome}</figcaption>
        </figure>
        <table>
${recuar(infobox, 10)}
        </table>
      </aside>

${recuar(wiki(p.lead), 6)}

      <div class="indice-slot" data-indice-slot></div>

${recuar(corpo, 6)}

${recuar(apoio(lang) || '<!-- apoio -->', 6)}
${recuar(newsletter(lang) || '<!-- newsletter -->', 6)}

      <section class="navbox" data-navbox aria-label="${t.outrasPessoas}"></section>

      <p class="ultima-edicao">${formatar(t.ultimaEdicao, { data: dataLonga(lang) })}</p>
    </main>
  </div>`.replace(/^\s*<!-- (apoio|newsletter) -->\n/gm, '');

  documento({
    lang,
    caminho,
    titulo: `${p.nome} — ${ui.site}`,
    descricao: p.resumo,
    tipo: 'article',
    pagina: 'artigo',
    pessoa: p.id,
    corpo: conteudo,
    og,
    alternativos: Object.fromEntries(IDIOMAS.map((l) => [l, caminhos.artigo(l, p.id)])),
    jsonld: [
      {
        '@type': 'Article',
        headline: p.nome,
        description: p.resumo,
        inLanguage: ui.html,
        url: absoluto(caminho),
        mainEntityOfPage: absoluto(caminho),
        image: absoluto(og),
        dateModified: config.atualizado,
        author: organizacao(),
        publisher: organizacao(),
        about: { '@type': 'Person', name: p.nomeCompleto ?? p.nome, sameAs: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.wikiEn.replace(/ /g, '_'))}` },
      },
      jsonTrilha(itensTrilha),
    ],
  });
}

// ---------------------------------------------------------------- página de citação
function cartaoCitacao(lang, raiz, c, extra = '') {
  const { ui, porId } = SITE[lang];
  const p = porId.get(c.autor);
  return `<figure class="cartao-pensamento" data-tema="${c.tema ?? ''}" data-indice="${c.indice}"${extra}>
  <blockquote><p><a class="cartao-link" href="${raiz}${caminhos.citacao(lang, c)}">${semTags(c.texto)}</a></p></blockquote>
  <figcaption>
    <div class="cartao-linha-autor">
      ${retrato(p, 'mini')}
      <span class="cartao-autor"><a href="${raiz}${caminhos.artigo(lang, p.id)}">${p.nome}</a>${c.falsa ? '' : `<span class="cartao-fonte">${semTags(c.fonte)}${selo(lang, c.rotulo)}</span>`}</span>
    </div>
    <div class="cartao-rodape">
      <span class="tema-etiqueta">${c.falsa ? ui.t.falsaRotulo : (ui.temas[c.tema] ?? '')}</span>
      <span class="cartao-acoes requer-js"></span>
    </div>
  </figcaption>
</figure>`;
}

function paginaCitacao(lang, c) {
  const { ui, porId, citacoes } = SITE[lang];
  const t = ui.t;
  const p = porId.get(c.autor);
  const caminho = caminhos.citacao(lang, c);
  const raiz = '../'.repeat(profundidade(caminho));
  const texto = semTags(c.texto);
  const curto = trecho(texto, 60);
  const itensTrilha = [[t.inicio, caminhos.inicio(lang)], [p.nome, caminhos.artigo(lang, p.id)], [c.falsa ? t.falsaRotulo : formatar(t.citacaoDe, { nome: p.nome }), caminho]];
  const verdadeiras = citacoes.filter((o) => o.autor === p.id && !o.falsa && o !== c);
  const doTema = c.tema ? citacoes.filter((o) => o.tema === c.tema && o.autor !== p.id && !o.falsa) : [];
  // Seleção estável de citações do mesmo tema, variando de página para página.
  const relacionadas = doTema
    .map((o) => ({ o, k: hash(`${c.slug}:${o.slug}`, 6) }))
    .sort((a, b) => a.k.localeCompare(b.k))
    .slice(0, 6)
    .map(({ o }) => o);

  const og = imagemOG(lang, c.falsa ? 'falsa' : 'citacao', {
    texto, nome: p.nome, fonte: c.falsa ? t.falsaRotulo : semTags(c.fonte), categoria: p.categorias[0],
  });

  const acoes = `<div class="citacao-acoes requer-js" data-acoes-citacao>
          <button class="botao" type="button" data-imagem>${ICONES.imagem}${t.imagem}</button>
          <button class="botao botao-discreto" type="button" data-compartilhar>${ICONES.compartilhar}${t.compartilhar}</button>
          <button class="botao botao-discreto" type="button" data-copiar-texto>${ICONES.copiar}${t.copiarTexto}</button>
          <button class="botao botao-discreto" type="button" data-copiar-link>${ICONES.link}${t.copiarLink}</button>
        </div>`;

  const principal = c.falsa
    ? `<p class="rotulo rotulo-alerta"><span>${t.falsaRotulo}</span></p>
        <h1 class="citacao-h1">${formatar(t.falsaH1, { nome: p.nome })}</h1>
        <figure class="citacao-grande citacao-falsa" data-citacao data-autor="${esc(p.nome)}" data-fonte="${esc(t.falsaRotulo)}">
          <blockquote><p>${texto}</p></blockquote>
        </figure>
        <div class="veredito">
          <p><b>${formatar(t.falsaVeredito, { nome: p.nome })}</b></p>
          <h2>${t.falsaOrigem}</h2>
          <p>${c.nota}</p>
        </div>`
    : `<h1 class="visualmente-oculto">${esc(formatar(t.tituloCitacao, { trecho: curto, nome: p.nome }))}</h1>
        <p class="rotulo"><span>${formatar(t.citacaoDe, { nome: p.nome })}</span></p>
        <figure class="citacao-grande" data-citacao data-autor="${esc(p.nome)}" data-fonte="${esc(semTags(c.fonte))}">
          <blockquote><p>${texto}</p></blockquote>
          <figcaption>
            ${retrato(p, 'medio')}
            <span>
              <a class="autor-nome" href="${raiz}${caminhos.artigo(lang, p.id)}">${p.nome}</a>
              <span class="autor-detalhe">${t.fonte}: ${c.fonte}${selo(lang, c.rotulo)}</span>
            </span>
          </figcaption>
        </figure>${c.nota ? `\n        <p class="citacao-nota-grande">${c.nota}</p>` : ''}`;

  const corpo = `  <main id="conteudo" class="pagina-citacao" tabindex="-1">
    <div class="pagina-citacao-topo">
      ${trilha(lang, raiz, itensTrilha)}
      <article class="citacao-principal">
        ${principal}
        ${acoes}
      </article>
    </div>

${recuar(anuncio('citacao') || '<!-- -->', 4)}

    <section class="citacao-secao sobre-autor" aria-labelledby="sobre-autor">
      ${retrato(p, 'medio')}
      <div>
        <h2 id="sobre-autor">${formatar(t.sobreAutor, { nome: p.nome })}</h2>
        <p class="sobre-autor-meta">${p.datas} · ${p.area}</p>
        <p>${p.resumo}</p>
        <a class="link-seta" href="${raiz}${caminhos.artigo(lang, p.id)}">${t.lerArtigo} →</a>
      </div>
    </section>
${verdadeiras.length ? `
    <section class="citacao-secao" aria-labelledby="mais-autor">
      <h2 id="mais-autor">${c.falsa ? formatar(t.oQueDisse, { nome: p.nome }) : formatar(t.maisDe, { nome: p.nome })}</h2>
      <div class="mural-grade mural-compacto">
${verdadeiras.map((o) => recuar(cartaoCitacao(lang, raiz, o), 8)).join('\n')}
      </div>
    </section>` : ''}
${relacionadas.length ? `
    <section class="citacao-secao" aria-labelledby="mais-tema">
      <h2 id="mais-tema">${formatar(t.maisTema, { tema: ui.temas[c.tema].toLowerCase() })}</h2>
      <div class="mural-grade mural-compacto">
${relacionadas.map((o) => recuar(cartaoCitacao(lang, raiz, o), 8)).join('\n')}
      </div>
    </section>` : ''}

${recuar(newsletter(lang) || '<!-- -->', 4)}
  </main>`.replace(/^\s*<!-- -->\n/gm, '');

  const titulo = c.falsa
    ? `${formatar(t.falsaTitulo, { nome: p.nome, trecho: trecho(texto, 55) })} — ${ui.site}`
    : `${formatar(t.tituloCitacao, { trecho: curto, nome: p.nome })} — ${ui.site}`;
  const descricao = c.falsa
    ? formatar(t.falsaDesc, { trecho: trecho(texto, 90), nome: p.nome })
    : `“${trecho(texto, 150)}” — ${p.nome}, ${semTags(c.fonte)}.`;

  documento({
    lang,
    caminho,
    titulo,
    descricao,
    tipo: 'article',
    pagina: 'citacao',
    pessoa: p.id,
    corpo,
    og,
    scripts: ['citacao.js'],
    jsonld: [
      c.falsa
        ? { '@type': 'WebPage', name: titulo, description: descricao, inLanguage: ui.html, url: absoluto(caminho), publisher: organizacao() }
        : {
          '@type': 'Quotation',
          text: texto,
          inLanguage: ui.html,
          url: absoluto(caminho),
          creator: { '@type': 'Person', name: p.nomeCompleto ?? p.nome, url: absoluto(caminhos.artigo(lang, p.id)) },
          citation: semTags(c.fonte),
          isPartOf: { '@type': 'WebSite', name: ui.site, url: absoluto(caminhos.inicio(lang)) },
        },
      jsonTrilha(itensTrilha),
    ],
  });
}

// ---------------------------------------------------------------- página inicial
function paginaInicio(lang) {
  const { ui, pessoas, porId, citacoes } = SITE[lang];
  const t = ui.t;
  const caminho = caminhos.inicio(lang);
  const raiz = '../'.repeat(profundidade(caminho));
  const doMural = citacoes.filter((c) => c.tema && !c.falsa);
  const falsas = citacoes.filter((c) => c.falsa);
  const primeira = doMural[0];
  const p1 = porId.get(primeira.autor);
  const autores = new Set(doMural.map((c) => c.autor)).size;

  const temas = [[`todos`, t.todos, doMural.length], ...Object.keys(ui.temas)
    .map((k) => [k, ui.temas[k], doMural.filter((c) => c.tema === k).length]).filter((x) => x[2])];

  const corpo = `  <main id="conteudo" class="inicio" tabindex="-1">
    <h1 class="visualmente-oculto">${t.h1Inicio}</h1>

    <section class="destaque" aria-labelledby="destaque-rotulo">
      <p class="rotulo" id="destaque-rotulo"><span>${t.pensamentoDoDia} <span aria-hidden="true">·</span> <time data-hoje></time></span></p>
      <figure class="destaque-citacao" data-destaque aria-live="polite">
        <blockquote><p><a class="cartao-link" href="${raiz}${caminhos.citacao(lang, primeira)}">${semTags(primeira.texto)}</a></p></blockquote>
        <figcaption>
          ${retrato(p1, 'medio')}
          <span>
            <a class="autor-nome" href="${raiz}${caminhos.artigo(lang, p1.id)}">${p1.nome}</a>
            <span class="autor-detalhe">${semTags(primeira.fonte)}${selo(lang, primeira.rotulo)}</span>
          </span>
        </figcaption>
      </figure>
      <div class="destaque-acoes requer-js">
        <button class="botao" type="button" data-outro>${ICONES.girar}${t.outro}</button>
        <button class="botao botao-discreto" type="button" data-compartilhar-destaque>${ICONES.compartilhar}${t.compartilhar}</button>
        <button class="botao botao-discreto" type="button" data-copiar-destaque>${ICONES.copiar}${t.copiar}</button>
      </div>
    </section>

${recuar(anuncio('inicio') || '<!-- -->', 4)}

    <section class="mural" aria-labelledby="mural-titulo">
      <header class="mural-cabecalho">
        <h2 id="mural-titulo">${t.tituloMural}</h2>
        <p class="mural-sub" data-contagem>${formatar(t.contagemInicial, { n: doMural.length, m: autores })}</p>
      </header>
      <div class="filtros requer-js" role="group" aria-label="${t.filtrarTema}" data-temas>
${temas.map(([k, nome, n]) => `        <button type="button" class="chip" data-tema="${k}" aria-pressed="${k === 'todos'}">${nome}<span class="chip-contagem">${n}</span></button>`).join('\n')}
      </div>
      <div class="mural-grade" data-mural>
${doMural.map((c) => recuar(cartaoCitacao(lang, raiz, c), 8)).join('\n')}
      </div>
      <div class="mural-mais requer-js">
        <button class="botao botao-discreto" type="button" data-mais hidden>${t.mostrarMais}</button>
      </div>
    </section>

${recuar(newsletter(lang) || '<!-- -->', 4)}

    <section class="mural mural-falsas" aria-labelledby="falsas-titulo">
      <header class="mural-cabecalho">
        <h2 id="falsas-titulo">${t.apocrifasTitulo}</h2>
        <p class="mural-sub">${t.apocrifasIntro}</p>
      </header>
      <div class="mural-grade">
${falsas.map((c) => recuar(cartaoCitacao(lang, raiz, c, ' data-falsa'), 8)).join('\n')}
      </div>
    </section>
  </main>`.replace(/^\s*<!-- -->\n/gm, '');

  const alternativos = Object.fromEntries(IDIOMAS.map((l) => [l, caminhos.inicio(l)]));
  documento({
    lang,
    caminho,
    titulo: t.tituloInicio,
    descricao: t.descInicio,
    pagina: 'inicio',
    ativo: 'inicio',
    corpo,
    alternativos,
    xDefault: '',
    scripts: ['inicio.js'],
    jsonld: [{
      '@type': 'WebSite',
      name: ui.site,
      url: absoluto(caminho),
      inLanguage: ui.html,
      description: t.descInicio,
      publisher: organizacao(),
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${absoluto(caminhos.lista(lang))}?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    }],
  });
  return pessoas.length;
}

// ---------------------------------------------------------------- lista
function cartaoPessoa(lang, raiz, p) {
  return `<li><a class="cartao-pessoa" href="${raiz}${caminhos.artigo(lang, p.id)}">${retrato(p, 'medio')}<div class="cartao-pessoa-texto"><h3>${p.nome}</h3><p class="cartao-pessoa-meta">${p.datas} · ${p.area}</p><p class="cartao-pessoa-resumo">${p.resumo}</p></div></a></li>`;
}

const LIMITES_ERAS = [476, 1400, 1800, Infinity];

function paginaLista(lang) {
  const { ui, pessoas } = SITE[lang];
  const t = ui.t;
  const caminho = caminhos.lista(lang);
  const raiz = '../'.repeat(profundidade(caminho));
  const grupos = ui.eras.map((nome, i) => ({
    nome,
    membros: pessoas.filter((p) => p.ano >= (i ? LIMITES_ERAS[i - 1] : -Infinity) && p.ano < LIMITES_ERAS[i]),
  })).filter((g) => g.membros.length);
  const contar = (n) => (n === 1 ? ui.js.umaPessoa : formatar(ui.js.nPessoas, { n }));
  const categorias = [['todas', t.todas, pessoas.length], ...Object.keys(ui.categorias)
    .map((k) => [k, ui.categorias[k], pessoas.filter((p) => p.categorias.includes(k)).length])];

  const corpo = `  <main id="conteudo" class="pagina-lista" tabindex="-1">
    <header class="pagina-cabecalho">
      <h1>${t.tituloLista}</h1>
      <p>${t.introLista}</p>
    </header>

    <div class="lista-controles requer-js">
      <label class="filtro-texto">
        <span class="visualmente-oculto">${t.filtrarRotulo}</span>
        ${ICONES.lupa}
        <input type="search" placeholder="${t.filtrarPlaceholder}" data-filtro-texto>
      </label>
      <div class="filtros" role="group" aria-label="${t.filtrarCategoria}" data-filtro-categorias>
${categorias.map(([k, nome, n]) => `        <button type="button" class="chip" data-categoria="${k}" aria-pressed="${k === 'todas'}">${nome}<span class="chip-contagem">${n}</span></button>`).join('\n')}
      </div>
      <div class="ordem" role="group" aria-label="${t.ordenar}">
        <button type="button" data-ordem="cronologica" aria-pressed="true">${t.cronologica}</button>
        <button type="button" data-ordem="alfabetica" aria-pressed="false">${t.alfabetica}</button>
      </div>
    </div>

    <p class="lista-resumo" data-resumo aria-live="polite">${formatar(ui.js.listaCrono, { n: pessoas.length })}</p>
    <div class="lista" data-lista>
${grupos.map((g) => `      <section class="grupo" aria-label="${g.nome}">
        <h2 class="grupo-titulo">${g.nome}<small>${contar(g.membros.length)}</small></h2>
        <ul class="grade-pessoas">
${g.membros.map((p) => `          ${cartaoPessoa(lang, raiz, p)}`).join('\n')}
        </ul>
      </section>`).join('\n')}
    </div>
  </main>`;

  const itensTrilha = [[t.inicio, caminhos.inicio(lang)], [t.pessoas, caminho]];
  documento({
    lang,
    caminho,
    titulo: `${t.tituloLista} — ${ui.site}`,
    descricao: t.descLista,
    pagina: 'personalidades',
    ativo: 'lista',
    corpo,
    alternativos: Object.fromEntries(IDIOMAS.map((l) => [l, caminhos.lista(l)])),
    scripts: ['personalidades.js'],
    jsonld: [
      {
        '@type': 'CollectionPage',
        name: t.tituloLista,
        description: t.descLista,
        inLanguage: ui.html,
        url: absoluto(caminho),
        hasPart: pessoas.map((p) => ({ '@type': 'Article', headline: p.nome, url: absoluto(caminhos.artigo(lang, p.id)) })),
      },
      jsonTrilha(itensTrilha),
    ],
  });
}

// ---------------------------------------------------------------- páginas institucionais
function dataLonga(lang) {
  return new Intl.DateTimeFormat(UI[lang].html, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${config.atualizado}T12:00:00Z`));
}

function paginaTexto(lang, nome) {
  const { ui, pessoas } = SITE[lang];
  const lista = new Intl.ListFormat(ui.html, { type: 'conjunction' }).format(IDIOMAS.map((l) => UI[l].nome));
  const p = ui.paginas[nome]({
    total: pessoas.length,
    idiomas: lista,
    contato: config.contato,
    responsavel: config.responsavel,
    data: dataLonga(lang),
    analytics: Boolean(config.analytics.plausible || config.analytics.cloudflare),
    anuncios: Boolean(config.anuncios.ativo && config.anuncios.cliente),
    afiliados: Boolean(config.afiliados[lang]?.tag),
    newsletter: Boolean(config.newsletter.acao),
  });
  const caminho = caminhos.pagina(lang, nome);
  documento({
    lang,
    caminho,
    titulo: `${p.titulo} — ${ui.site}`,
    descricao: p.descricao,
    pagina: nome,
    ativo: nome,
    alternativos: Object.fromEntries(IDIOMAS.map((l) => [l, caminhos.pagina(l, nome)])),
    corpo: `  <main id="conteudo" class="pagina-texto" tabindex="-1">
    <header class="pagina-cabecalho">
      <h1>${p.titulo}</h1>
      <p>${p.intro}</p>
    </header>

${recuar(p.corpo, 4)}
  </main>`,
  });
}

// ---------------------------------------------------------------- dados para o navegador
function dadosJs(lang) {
  const { ui, pessoas, citacoes } = SITE[lang];
  const j = (v) => JSON.stringify(v);
  const linhasPessoas = pessoas.map((p) => `    { id: ${j(p.id)}, url: ${j(caminhos.artigo(lang, p.id))}, nome: ${j(p.nome)}, datas: ${j(p.datas)}, ano: ${p.ano}, area: ${j(p.area)}, categorias: ${j(p.categorias)}, resumo: ${j(p.resumo)}, wiki: ${j(p.wikiEn)} }`).join(',\n');
  const linhasCitacoes = citacoes.map((c) => {
    const campos = [`autor: ${j(c.autor)}`, `url: ${j(caminhos.citacao(lang, c))}`, `tema: ${j(c.tema ?? '')}`, `texto: ${j(semTags(c.texto))}`, `fonte: ${j(semTags(c.fonte))}`];
    if (c.rotulo) campos.push(`rotulo: ${j(ui.rotulos[c.rotulo] ?? c.rotulo)}`);
    if (c.falsa) campos.push('falsa: true');
    return `    { ${campos.join(', ')} }`;
  }).join(',\n');

  return `/* Pensapédia — dados gerados por src/construir.mjs (${lang}). Não edite à mão. */
window.PENSAPEDIA = {
  idioma: ${j(lang)},
  locale: ${j(ui.html)},
  site: ${j(ui.site)},
  endereco: ${j(URL_SITE.replace(/^https?:\/\//, ''))},
  rotas: ${j({ lista: caminhos.lista(lang) })},
  textos: ${JSON.stringify(ui.js, null, 4).replace(/\n}/, '\n  }')},
  categorias: ${j(ui.categorias)},
  temas: ${j(ui.temas)},
  eras: ${j(ui.eras.map((nome, i) => ({ nome, ate: LIMITES_ERAS[i] === Infinity ? null : LIMITES_ERAS[i] })))},
  pessoas: [
${linhasPessoas},
  ],
  pensamentos: [
${linhasCitacoes},
  ],
};
`;
}

// ---------------------------------------------------------------- raiz, 404, sitemap e PWA
function paginaRaiz() {
  const links = IDIOMAS.map((l) => `      <li><a href="${caminhos.inicio(l)}" hreflang="${UI[l].hreflang}" lang="${UI[l].html}" data-idioma="${l}"><span class="escolha-nome">${UI[l].nome}</span><span class="escolha-slogan">${UI[l].sloganLongo}</span></a></li>`).join('\n');
  const hreflang = [...IDIOMAS.map((l) => `  <link rel="alternate" hreflang="${UI[l].hreflang}" href="${absoluto(caminhos.inicio(l))}">`),
    `  <link rel="alternate" hreflang="x-default" href="${URL_SITE}/">`].join('\n');
  const mapa = Object.fromEntries(IDIOMAS.map((l) => [l, caminhos.inicio(l)]));
  return `<!DOCTYPE html>
<html lang="en" class="sem-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pensapédia</title>
  <meta name="description" content="${esc(UI.en?.t.descInicio ?? UI[IDIOMAS[0]].t.descInicio)}">
  <link rel="canonical" href="${URL_SITE}/">
${hreflang}
  <meta property="og:title" content="Pensapédia">
  <meta property="og:image" content="${absoluto(imagemOG(IDIOMAS[0], 'site', { titulo: UI[IDIOMAS[0]].t.tituloMural, slogan: UI[IDIOMAS[0]].sloganLongo }))}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="stylesheet" href="${comVersao('assets/css/estilo.css')}">
  <script>
    (function () {
      var mapa = ${JSON.stringify(mapa)};
      var escolhido = null;
      try { escolhido = localStorage.getItem('pensapedia:idioma'); } catch (e) {}
      if (!mapa[escolhido]) {
        var prefs = navigator.languages || [navigator.language || ''];
        for (var i = 0; i < prefs.length && !mapa[escolhido]; i++) escolhido = String(prefs[i]).slice(0, 2).toLowerCase();
      }
      location.replace(mapa[escolhido] || mapa[${JSON.stringify(IDIOMAS[0])}]);
    })();
  </script>
</head>
<body class="escolha-idioma">
  <main>
    ${ICONES.coruja}
    <h1>Pensapédia</h1>
    <ul>
${links}
    </ul>
  </main>
</body>
</html>
`;
}

function pagina404() {
  const blocos = IDIOMAS.map((l) => `      <section lang="${UI[l].html}">
        <h2>${UI[l].t.naoEncontrada}</h2>
        <p>${UI[l].t.naoEncontradaTexto} <a href="${URL_SITE}/${caminhos.inicio(l)}">${UI[l].site} — ${UI[l].nome}</a></p>
      </section>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 — Pensapédia</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="${URL_SITE}/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${URL_SITE}/${comVersao('assets/css/estilo.css')}">
</head>
<body class="escolha-idioma">
  <main>
    <a href="${URL_SITE}/" aria-label="Pensapédia">${ICONES.coruja}</a>
    <h1>404</h1>
${blocos}
  </main>
</body>
</html>
`;
}

function paginaOffline() {
  const textos = {
    pt: ['Você está sem conexão', 'As páginas que você já visitou continuam disponíveis. Tente de novo quando a internet voltar.'],
    en: ['You are offline', 'Pages you have already visited are still available. Try again when you are back online.'],
    es: ['Estás sin conexión', 'Las páginas que ya visitaste siguen disponibles. Inténtalo de nuevo cuando vuelva la conexión.'],
  };
  const blocos = IDIOMAS.filter((l) => textos[l]).map((l) => `    <section lang="${UI[l].html}"><h2>${textos[l][0]}</h2><p>${textos[l][1]}</p></section>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pensapédia — offline</title>
  <meta name="robots" content="noindex">
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f2eb; color: #1f1b16; font: 17px/1.6 system-ui, sans-serif; }
    main { max-width: 34rem; padding: 2rem 1.25rem; text-align: center; }
    h1 { font: 500 2.4rem Georgia, serif; margin: 0 0 1rem; }
    h2 { font-size: 1.1rem; margin: 1.5rem 0 0.25rem; }
    p { margin: 0; color: #5d5549; }
    button { margin-top: 2rem; padding: 0.6rem 1.2rem; border: 0; border-radius: 999px; background: #8a5a14; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
    @media (prefers-color-scheme: dark) { body { background: #14120f; color: #ede6d9; } p { color: #b3a895; } }
  </style>
</head>
<body>
  <main>
    <h1>Pensapédia</h1>
${blocos}
    <button type="button" onclick="location.reload()">↻</button>
  </main>
</body>
</html>
`;
}

const paginasSitemap = [];
function registrar(caminho, alternativos) {
  paginasSitemap.push({ caminho, alternativos });
}

function sitemap() {
  const linhas = paginasSitemap.map(({ caminho, alternativos }) => {
    const alt = alternativos
      ? Object.entries(alternativos).map(([l, c]) => `\n    <xhtml:link rel="alternate" hreflang="${UI[l].hreflang}" href="${absoluto(c)}"/>`).join('')
      : '';
    return `  <url>\n    <loc>${absoluto(caminho)}</loc>\n    <lastmod>${config.atualizado}</lastmod>${alt}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${linhas.join('\n')}
</urlset>
`;
}

function manifesto() {
  const l = IDIOMAS[0];
  return JSON.stringify({
    name: 'Pensapédia',
    short_name: 'Pensapédia',
    description: UI[l].t.descInicio,
    lang: UI[l].html,
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#f5f2eb',
    theme_color: '#fffdf9',
    icons: [
      { src: 'assets/img/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'assets/img/icone-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'assets/img/icone-mascaravel-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2);
}

function serviceWorker() {
  const essenciais = [
    'offline.html',
    comVersao('assets/css/estilo.css'),
    comVersao('assets/js/site.js'),
    'assets/fontes/source-sans-3-latin-wght-normal.woff2',
    'assets/fontes/eb-garamond-latin-wght-normal.woff2',
    'assets/fontes/eb-garamond-latin-wght-italic.woff2',
    'assets/img/favicon.svg',
  ];
  const versaoSw = hash(JSON.stringify([essenciais, Object.values(versao)]), 10);
  return `/* Pensapédia — service worker gerado por src/construir.mjs. */
const VERSAO = 'pensapedia-${versaoSw}';
const ESSENCIAIS = ${JSON.stringify(essenciais)};

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO && n !== 'pensapedia-paginas').map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if (pedido.method !== 'GET' || url.origin !== self.location.origin) return;

  // Páginas: tenta a rede primeiro; sem conexão, usa a cópia guardada.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone();
            caches.open('pensapedia-paginas').then((cache) => cache.put(pedido, copia));
          }
          return resposta;
        })
        .catch(() => caches.match(pedido).then((guardada) => guardada || caches.match('offline.html'))),
    );
    return;
  }

  // Arquivos do site: responde com a cópia guardada e atualiza em segundo plano.
  evento.respondWith(
    caches.open(VERSAO).then((cache) => cache.match(pedido).then((guardada) => {
      const daRede = fetch(pedido).then((resposta) => {
        if (resposta.ok) cache.put(pedido, resposta.clone());
        return resposta;
      }).catch(() => guardada);
      return guardada || daRede;
    })),
  );
});
`;
}

// ---------------------------------------------------------------- construção
for (const lang of IDIOMAS) {
  writeFileSync(join(ASSETS, 'js', `dados-${lang}.js`), dadosJs(lang));
}

for (const lang of IDIOMAS) {
  const { pessoas, citacoes } = SITE[lang];
  const alt = (fn) => Object.fromEntries(IDIOMAS.map((l) => [l, fn(l)]));

  paginaInicio(lang);
  registrar(caminhos.inicio(lang), alt(caminhos.inicio));
  paginaLista(lang);
  registrar(caminhos.lista(lang), alt(caminhos.lista));
  for (const p of pessoas) {
    paginaArtigo(lang, p);
    registrar(caminhos.artigo(lang, p.id), alt((l) => caminhos.artigo(l, p.id)));
  }
  for (const c of citacoes) {
    paginaCitacao(lang, c);
    registrar(caminhos.citacao(lang, c));
  }
  for (const nome of ['sobre', 'privacidade', 'termos']) {
    paginaTexto(lang, nome);
    registrar(caminhos.pagina(lang, nome), alt((l) => caminhos.pagina(l, nome)));
  }
}

escrever('', paginaRaiz());
escrever('404.html', pagina404());
escrever('offline.html', paginaOffline());
escrever('sitemap.xml', sitemap());
escrever('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${URL_SITE}/sitemap.xml\n`);
escrever('manifest.webmanifest', manifesto());
escrever('sw.js', serviceWorker());
if (config.anuncios.cliente) {
  escrever('ads.txt', `google.com, ${config.anuncios.cliente.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
}

// Lista de imagens de compartilhamento para src/imagens.mjs.
const unicas = [...new Map(imagensOG.map((i) => [i.arquivo, i])).values()];
mkdirSync(join(RAIZ, 'src', 'gerado'), { recursive: true });
writeFileSync(join(RAIZ, 'src', 'gerado', 'imagens.json'), JSON.stringify(unicas, null, 1));
const PASTA_OG = join(ASSETS, 'og');
const faltando = unicas.filter((i) => !existsSync(join(PASTA_OG, i.arquivo)));

const totalCitacoes = IDIOMAS.reduce((n, l) => n + SITE[l].citacoes.length, 0);
console.log(`Idiomas: ${IDIOMAS.join(', ')}`);
console.log(`${SITE[IDIOMAS[0]].pessoas.length} personalidades por idioma, ${totalCitacoes} páginas de citação, ${paginasSitemap.length} páginas no sitemap.`);
if (faltando.length) console.log(`Faltam ${faltando.length} imagens de compartilhamento: rode "node src/imagens.mjs".`);
const naoUsadas = existsSync(PASTA_OG) ? readdirSync(PASTA_OG).filter((f) => !unicas.some((i) => i.arquivo === f)) : [];
if (naoUsadas.length) console.log(`${naoUsadas.length} imagens antigas não são mais usadas (o próximo "node src/imagens.mjs" as remove).`);
