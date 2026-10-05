# Pensapédia

**A enciclopédia dos grandes pensadores e nomes da humanidade.**

Site no estilo da Wikipédia sobre filósofos, cientistas, artistas e líderes. A página inicial reúne grandes pensamentos e dizeres; cada personalidade tem um artigo próprio e cada citação tem uma página própria, com a fonte verificada e uma imagem pronta para compartilhar.

## Como funciona

O conteúdo fica em `src/` e o site pronto é gerado na pasta `docs/`, que é a publicada.

```
src/
  config.mjs              endereço do site e recursos de monetização (anúncios, afiliados, newsletter, apoio)
  construir.mjs           gera o site em docs/ (só precisa do Node.js 18+)
  imagens.mjs             gera as imagens de compartilhamento e os ícones (usa o Playwright)
  idiomas/                textos da interface e páginas institucionais de cada idioma
  conteudo/pt/            artigos e citações em português (fonte dos dados comuns a todos os idiomas)
  conteudo/en/, es/       traduções
  conteudo/livros.mjs     obras indicadas em cada artigo
  estaticos/              CSS, JavaScript, fontes e ícones
docs/                     site gerado (não edite à mão)
```

Para gerar o site depois de editar qualquer arquivo de `src/`:

```bash
node src/construir.mjs     # gera as páginas
node src/imagens.mjs       # gera as imagens que faltarem (opcional)
python3 -m http.server 8000 --directory docs   # para ver em http://localhost:8000
```

## O que o site tem

- Vários idiomas, com endereços próprios (`/pt/`, `/en/`, `/es/`) e escolha automática pelo idioma do navegador.
- Artigos com ficha, índice automático, biografia, pensamento, legado, citações, atribuições incorretas e obras recomendadas.
- Uma página para cada citação e para cada frase falsamente atribuída, com imagem de compartilhamento.
- Busca, artigo aleatório, tema claro e escuro, leitura offline (PWA) e fontes hospedadas no próprio site.
- Sitemap, `robots.txt`, links canônicos, `hreflang` e dados estruturados (schema.org) para buscadores.
- Políticas de privacidade e termos de uso que se ajustam aos recursos ligados em `config.mjs`.

## Monetização

Tudo começa desligado. Em `src/config.mjs` preencha:

- `afiliados` — códigos de associado da Amazon por idioma;
- `newsletter` — endereço de inscrição do serviço de e-mail (ex.: Buttondown);
- `anuncios` — dados do Google AdSense, depois de aprovado;
- `apoio` — link de doações ou assinaturas;
- `analytics` — estatísticas sem cookies (Plausible ou Cloudflare);
- `url` — o domínio próprio, quando houver.

Depois rode `node src/construir.mjs` e publique.

## Publicação

No GitHub, em **Settings → Pages**, escolha **Deploy from a branch**, a branch `main` e a pasta `/docs`. Para uso comercial, a recomendação é publicar a mesma pasta `docs/` na Cloudflare Pages ou na Netlify, com domínio próprio.
