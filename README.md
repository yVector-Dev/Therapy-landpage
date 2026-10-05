# Pensapédia

**A enciclopédia dos grandes pensadores e nomes da humanidade.**

Um site no estilo da Wikipédia dedicado a filósofos, cientistas, artistas e líderes que marcaram a história. A página inicial é só de grandes pensamentos e dizeres; cada personalidade tem um artigo próprio, com ficha (infobox), índice, biografia, pensamento, legado, citações com fonte e ligações para artigos relacionados.

## Páginas

O site fica inteiro dentro da pasta `docs/`.

| Página | O que tem |
| --- | --- |
| `index.html` | Pensamento do dia (muda a cada dia) e mural com mais de cem pensamentos, filtráveis por tema |
| `personalidades.html` | Todas as personalidades, com filtro por nome, categoria e ordem cronológica ou alfabética |
| `personalidades/*.html` | Um artigo por personalidade (27 no total) |
| `sobre.html` | O que é o site e como as citações são verificadas |

Personalidades incluídas: Lao-Tsé, Buda, Confúcio, Sócrates, Platão, Aristóteles, Sêneca, Marco Aurélio, Santo Agostinho, Tomás de Aquino, Leonardo da Vinci, William Shakespeare, Galileu Galilei, René Descartes, Isaac Newton, Immanuel Kant, Charles Darwin, Machado de Assis, Friedrich Nietzsche, Marie Curie, Mahatma Gandhi, Albert Einstein, Hannah Arendt, Simone de Beauvoir, Nelson Mandela, Paulo Freire e Martin Luther King Jr.

## Recursos

- Busca com sugestões em todas as páginas (aceita digitar sem acentos).
- Botão "Aleatório", que abre um artigo qualquer.
- Tema claro e escuro (segue o sistema e pode ser trocado no botão do topo).
- Índice automático em cada artigo, fixo na lateral em telas grandes.
- Quadro de navegação no fim de cada artigo com todas as personalidades.
- Retratos carregados da Wikimedia Commons via Wikipédia; sem conexão, aparece a inicial do nome.
- Citações marcadas como **Paráfrase** ou **Atribuída** quando for o caso, e seção de **Atribuições incorretas** para frases famosas que não são do autor.
- Layout responsivo, pensado também para celular.

## Como ver no computador

É um site estático (HTML, CSS e JavaScript puros, sem dependências). Basta abrir o `docs/index.html` no navegador ou, para simular um servidor:

```bash
python3 -m http.server 8000 --directory docs
# depois abra http://localhost:8000
```

## Como publicar no GitHub Pages

1. No GitHub, vá em **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**, selecione a branch `main` e a pasta `/docs`.
3. Salve. Em alguns minutos o site estará no endereço indicado pelo GitHub.

## Como acrescentar uma personalidade

1. Copie um arquivo de `docs/personalidades/` (por exemplo, `socrates.html`) com um novo nome, como `hipatia.html`.
2. Edite o título, a ficha (`<aside class="infobox">`), o texto e as citações. O índice "Conteúdo" é montado sozinho a partir dos títulos `<h2>` e `<h3>`.
3. No `<span class="retrato retrato-grande" ...>`, ajuste `data-wiki` com o título do artigo na Wikipédia em inglês (é de lá que vem o retrato).
4. Registre a pessoa na lista `pessoas` de `docs/js/dados.js`, usando como `id` o nome do arquivo sem `.html`. Assim ela aparece na busca, na página de personalidades, no "Aleatório" e no quadro de navegação.
5. Para levar frases à página inicial, acrescente-as à lista `pensamentos` do mesmo arquivo.

## Estrutura

```
docs/
  index.html              página inicial (pensamentos)
  personalidades.html     lista de personalidades
  sobre.html              sobre o site
  personalidades/         um artigo por personalidade
  css/estilo.css          todo o visual, com tema claro e escuro
  js/dados.js             registro de personalidades e pensamentos
  js/site.js              busca, tema, retratos, índice e navegação (todas as páginas)
  js/inicio.js            pensamento do dia e mural da página inicial
  js/personalidades.js    filtros da página de personalidades
  img/favicon.svg         ícone (a coruja, símbolo da sabedoria)
  .nojekyll               faz o GitHub Pages publicar os arquivos como estão
```
