/*
 * Pensapédia — comportamento comum a todas as páginas:
 * tema, idioma, busca, artigo aleatório, retratos, índice dos artigos,
 * quadro de navegação, compartilhamento e modo offline.
 */
(function () {
  'use strict';

  var D = window.PENSAPEDIA || { textos: {}, categorias: {}, temas: {}, pessoas: [], pensamentos: [] };
  var T = D.textos || {};
  var raiz = document.body.getAttribute('data-raiz') || '';
  var pagina = document.body.getAttribute('data-pagina') || '';

  var pessoasPorId = {};
  D.pessoas.forEach(function (p) {
    pessoasPorId[p.id] = p;
  });

  // ------------------------------------------------------------ utilidades
  function t(chave, vars) {
    var modelo = T[chave] || chave;
    return modelo.replace(/\{(\w+)\}/g, function (m, k) {
      return vars && k in vars ? vars[k] : m;
    });
  }

  function urlPessoa(p) {
    return raiz + p.url;
  }

  function absoluta(caminhoRelativo) {
    return new URL(caminhoRelativo, window.location.href).href;
  }

  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  function criar(tag, atributos, filhos) {
    var el = document.createElement(tag);
    Object.keys(atributos || {}).forEach(function (chave) {
      var valor = atributos[chave];
      if (valor === null || valor === undefined || valor === false) return;
      if (chave === 'texto') el.textContent = valor;
      else if (chave === 'classe') el.className = valor;
      else if (chave === 'html') el.innerHTML = valor;
      else el.setAttribute(chave, valor === true ? '' : valor);
    });
    (filhos || []).forEach(function (filho) {
      if (filho === null || filho === undefined) return;
      el.appendChild(typeof filho === 'string' ? document.createTextNode(filho) : filho);
    });
    return el;
  }

  function ler(chave) {
    try {
      return window.localStorage.getItem(chave);
    } catch (e) {
      return null;
    }
  }

  function gravar(chave, valor) {
    try {
      window.localStorage.setItem(chave, valor);
    } catch (e) {
      /* armazenamento indisponível: segue sem lembrar */
    }
  }

  var ICONES = {
    copiar: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>',
    compartilhar: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>',
  };

  // ------------------------------------------------------------ aviso flutuante
  var aviso = null;
  var avisoTempo = null;

  function avisar(mensagem) {
    if (!aviso) {
      aviso = criar('div', { classe: 'aviso-flutuante', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(aviso);
    }
    aviso.textContent = mensagem;
    aviso.classList.add('visivel');
    clearTimeout(avisoTempo);
    avisoTempo = setTimeout(function () {
      aviso.classList.remove('visivel');
    }, 2200);
  }

  function copiar(texto, mensagem) {
    var ok = mensagem || t('copiado');
    function alternativa() {
      var campo = criar('textarea', { 'aria-hidden': 'true' });
      campo.value = texto;
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      var deu = false;
      try {
        deu = document.execCommand('copy');
      } catch (e) {
        deu = false;
      }
      campo.remove();
      avisar(deu ? ok : t('naoCopiou'));
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(function () {
        avisar(ok);
      }, alternativa);
    } else {
      alternativa();
    }
  }

  // Abre o menu de compartilhamento do aparelho; sem ele, copia o link.
  function compartilhar(dados) {
    if (navigator.share) {
      navigator.share(dados).catch(function () {
        /* cancelado pelo usuário */
      });
    } else {
      copiar(dados.url, t('linkCopiado'));
    }
  }

  // ------------------------------------------------------------ tema
  function temaAtual() {
    var escolhido = document.documentElement.getAttribute('data-tema');
    if (escolhido) return escolhido;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  }

  document.querySelectorAll('.botao-tema').forEach(function (botao) {
    botao.addEventListener('click', function () {
      var novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
      document.documentElement.setAttribute('data-tema', novo);
      gravar('pensapedia:tema', novo);
    });
  });

  // ------------------------------------------------------------ idioma
  // Lembra o idioma escolhido para a próxima visita à página de entrada.
  if (D.idioma) gravar('pensapedia:idioma', D.idioma);
  document.querySelectorAll('a[data-idioma]').forEach(function (link) {
    link.addEventListener('click', function () {
      gravar('pensapedia:idioma', link.getAttribute('data-idioma'));
    });
  });
  var seletor = document.querySelector('.idiomas');
  if (seletor) {
    document.addEventListener('click', function (evento) {
      if (seletor.open && !seletor.contains(evento.target)) seletor.open = false;
    });
    seletor.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') {
        seletor.open = false;
        seletor.querySelector('summary').focus();
      }
    });
  }

  // ------------------------------------------------------------ retratos
  // Mostra a inicial da pessoa e, quando possível, troca pelo retrato
  // principal do artigo correspondente na Wikipédia (Wikimedia Commons).
  function inicial(nome) {
    return nome.replace(/^(Santo|São|Santa|San|Saint)\s+/, '').charAt(0);
  }

  function retrato(pessoa, tamanho) {
    return criar('span', {
      classe: 'retrato retrato-' + (tamanho || 'medio'),
      'data-wiki': pessoa.wiki,
      'data-categoria': pessoa.categorias[0],
      'data-nome': pessoa.nome,
    }, [criar('span', { classe: 'monograma', 'aria-hidden': 'true', texto: inicial(pessoa.nome) })]);
  }

  var CHAVE_RETRATOS = 'pensapedia:retratos:v1';
  var VALIDADE = 7 * 24 * 60 * 60 * 1000;
  var cacheRetratos = (function () {
    try {
      var salvo = JSON.parse(ler(CHAVE_RETRATOS));
      if (salvo && salvo.urls && Date.now() - salvo.t < VALIDADE) return salvo;
    } catch (e) {
      /* cache corrompido: recomeça */
    }
    return { t: Date.now(), urls: {} };
  })();
  var buscasPendentes = {};

  function consultarWikipedia(titulos) {
    var endereco = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*' +
      '&prop=pageimages&piprop=thumbnail&pithumbsize=400&redirects=1&titles=' +
      encodeURIComponent(titulos.join('|'));

    return fetch(endereco)
      .then(function (resposta) {
        if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
        return resposta.json();
      })
      .then(function (dados) {
        var consulta = dados.query || {};
        var destino = {};
        titulos.forEach(function (titulo) {
          destino[titulo] = titulo;
        });
        (consulta.normalized || []).concat(consulta.redirects || []).forEach(function (troca) {
          titulos.forEach(function (titulo) {
            if (destino[titulo] === troca.from) destino[titulo] = troca.to;
          });
        });
        var imagens = {};
        (consulta.pages || []).forEach(function (p) {
          imagens[p.title] = p.thumbnail ? p.thumbnail.source : null;
        });
        titulos.forEach(function (titulo) {
          cacheRetratos.urls[titulo] = imagens[destino[titulo]] || null;
        });
        gravar(CHAVE_RETRATOS, JSON.stringify(cacheRetratos));
      })
      .catch(function () {
        /* sem rede ou API indisponível: ficam as iniciais */
      });
  }

  function colocarImagem(alvo, url) {
    if (alvo.querySelector('img')) return;
    var img = new Image();
    img.decoding = 'async';
    img.alt = alvo.classList.contains('retrato-grande') ? t('retratoDe', { nome: alvo.getAttribute('data-nome') || '' }) : '';
    img.addEventListener('load', function () {
      img.classList.add('carregado');
    });
    img.addEventListener('error', function () {
      img.remove();
    });
    img.src = url;
    alvo.appendChild(img);
  }

  function carregarRetratos(contexto) {
    var alvos = Array.prototype.slice.call(
      (contexto || document).querySelectorAll('.retrato[data-wiki]:not([data-pronto])')
    );
    if (!alvos.length) return;

    var faltam = [];
    alvos.forEach(function (alvo) {
      var titulo = alvo.getAttribute('data-wiki');
      if (!(titulo in cacheRetratos.urls) && faltam.indexOf(titulo) === -1) faltam.push(titulo);
    });

    for (var i = 0; i < faltam.length; i += 50) {
      var lote = faltam.slice(i, i + 50).filter(function (titulo) {
        return !buscasPendentes[titulo];
      });
      if (lote.length) {
        var promessa = consultarWikipedia(lote);
        lote.forEach(function (titulo) {
          buscasPendentes[titulo] = promessa;
        });
      }
    }
    var esperas = [];
    faltam.forEach(function (titulo) {
      if (buscasPendentes[titulo] && esperas.indexOf(buscasPendentes[titulo]) === -1) esperas.push(buscasPendentes[titulo]);
    });

    Promise.all(esperas).then(function () {
      alvos.forEach(function (alvo) {
        var url = cacheRetratos.urls[alvo.getAttribute('data-wiki')];
        if (url) colocarImagem(alvo, url);
        alvo.setAttribute('data-pronto', '');
      });
    });
  }

  // ------------------------------------------------------------ busca
  function pesquisar(termo, limite) {
    var texto = normalizar(termo).trim();
    if (!texto) return [];
    var palavras = texto.split(/\s+/);
    var resultados = [];
    D.pessoas.forEach(function (p) {
      var nome = normalizar(p.nome);
      var resto = normalizar([p.area, p.resumo, p.datas].join(' '));
      var pontos = 0;
      var todas = palavras.every(function (palavra) {
        var escapada = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (nome.indexOf(palavra) === 0) pontos += 6;
        else if (new RegExp('\\b' + escapada).test(nome)) pontos += 4;
        else if (nome.indexOf(palavra) !== -1) pontos += 2;
        else if (resto.indexOf(palavra) !== -1) pontos += 1;
        else return false;
        return true;
      });
      if (todas) resultados.push({ pessoa: p, pontos: pontos });
    });
    resultados.sort(function (a, b) {
      return b.pontos - a.pontos || a.pessoa.nome.localeCompare(b.pessoa.nome, D.locale);
    });
    return resultados.slice(0, limite || resultados.length).map(function (r) {
      return r.pessoa;
    });
  }

  function iniciarBusca() {
    var form = document.querySelector('.busca');
    var campo = document.getElementById('busca-campo');
    var lista = document.getElementById('busca-sugestoes');
    if (!form || !campo || !lista) return;

    var itens = [];
    var selecionado = -1;

    function fechar() {
      lista.hidden = true;
      campo.setAttribute('aria-expanded', 'false');
      campo.removeAttribute('aria-activedescendant');
      selecionado = -1;
    }

    function marcar(indice) {
      selecionado = indice;
      Array.prototype.forEach.call(lista.children, function (li, i) {
        li.setAttribute('aria-selected', i === indice ? 'true' : 'false');
      });
      if (indice >= 0 && lista.children[indice]) {
        campo.setAttribute('aria-activedescendant', lista.children[indice].id);
        lista.children[indice].scrollIntoView({ block: 'nearest' });
      } else {
        campo.removeAttribute('aria-activedescendant');
      }
    }

    function atualizar() {
      var termo = campo.value;
      lista.innerHTML = '';
      selecionado = -1;
      if (!termo.trim()) return fechar();

      itens = pesquisar(termo, 8);
      if (!itens.length) {
        lista.appendChild(criar('li', { classe: 'busca-vazia', role: 'option', 'aria-disabled': 'true', texto: t('buscaVazia') }));
      }
      itens.forEach(function (p, i) {
        lista.appendChild(criar('li', { id: 'sugestao-' + i, role: 'option', 'aria-selected': 'false' }, [
          criar('a', { href: urlPessoa(p), tabindex: '-1' }, [
            retrato(p, 'mini'),
            criar('span', { classe: 'sugestao-texto' }, [
              criar('span', { classe: 'sugestao-nome', texto: p.nome }),
              criar('span', { classe: 'sugestao-detalhe', texto: p.area + ' · ' + p.datas }),
            ]),
          ]),
        ]));
      });
      lista.hidden = false;
      campo.setAttribute('aria-expanded', 'true');
      carregarRetratos(lista);
    }

    campo.addEventListener('input', atualizar);
    campo.addEventListener('focus', function () {
      if (campo.value.trim()) atualizar();
    });

    campo.addEventListener('keydown', function (evento) {
      if (lista.hidden && evento.key !== 'ArrowDown') return;
      if (evento.key === 'ArrowDown') {
        evento.preventDefault();
        if (lista.hidden) return atualizar();
        if (itens.length) marcar((selecionado + 1) % itens.length);
      } else if (evento.key === 'ArrowUp') {
        evento.preventDefault();
        if (itens.length) marcar(selecionado <= 0 ? itens.length - 1 : selecionado - 1);
      } else if (evento.key === 'Escape') {
        fechar();
      }
    });

    form.addEventListener('submit', function (evento) {
      var escolhido = selecionado >= 0 ? itens[selecionado] : (itens.length === 1 ? itens[0] : null);
      if (!escolhido && campo.value.trim()) {
        var exato = pesquisar(campo.value, 1)[0];
        if (exato && normalizar(exato.nome) === normalizar(campo.value).trim()) escolhido = exato;
      }
      if (escolhido) {
        evento.preventDefault();
        window.location.href = urlPessoa(escolhido);
      }
    });

    document.addEventListener('click', function (evento) {
      if (!form.contains(evento.target)) fechar();
    });
  }

  // ------------------------------------------------------------ artigo aleatório
  function iniciarAleatorio() {
    var atual = document.body.getAttribute('data-pessoa');
    document.querySelectorAll('[data-aleatorio]').forEach(function (link) {
      link.addEventListener('click', function (evento) {
        var opcoes = D.pessoas.filter(function (p) {
          return p.id !== atual;
        });
        if (!opcoes.length) return;
        evento.preventDefault();
        window.location.href = urlPessoa(opcoes[Math.floor(Math.random() * opcoes.length)]);
      });
    });
  }

  // ------------------------------------------------------------ índice do artigo
  function iniciarIndice() {
    var layout = document.querySelector('.artigo-layout');
    var artigo = document.querySelector('.artigo');
    var lateral = document.querySelector('[data-indice-lateral]');
    var slot = document.querySelector('[data-indice-slot]');
    if (!layout || !artigo || !lateral || !slot) return;

    var titulos = Array.prototype.filter.call(artigo.querySelectorAll('h2, h3'), function (h) {
      return !h.closest('.infobox, .navbox, .caixa-newsletter, .caixa-apoio');
    });
    if (titulos.length < 3) return;

    var usados = {};
    titulos.forEach(function (h) {
      if (!h.id) {
        var base = normalizar(h.textContent).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'secao';
        var id = base;
        var n = 2;
        while (usados[id] || document.getElementById(id)) id = base + '-' + n++;
        h.id = id;
      }
      usados[h.id] = true;
    });

    function link(h, numero) {
      return criar('a', { href: '#' + h.id, 'data-alvo': h.id }, [
        criar('span', { classe: 'indice-num', texto: numero }), ' ' + h.textContent,
      ]);
    }

    function construirLista() {
      var raizLista = criar('ol');
      raizLista.appendChild(criar('li', null, [criar('a', { href: '#conteudo', texto: t('indiceInicio') })]));
      var n2 = 0;
      var n3 = 0;
      var subLista = null;
      var itemAtual = null;
      titulos.forEach(function (h) {
        if (h.tagName !== 'H3' || !itemAtual) {
          n2 += 1;
          n3 = 0;
          subLista = null;
          itemAtual = criar('li', null, [link(h, String(n2))]);
          raizLista.appendChild(itemAtual);
        } else {
          if (!subLista) {
            subLista = criar('ol');
            itemAtual.appendChild(subLista);
          }
          n3 += 1;
          subLista.appendChild(criar('li', null, [link(h, n2 + '.' + n3)]));
        }
      });
      return raizLista;
    }

    var largo = window.matchMedia('(min-width: 1100px)');
    var linksLaterais = [];

    function posicionar() {
      lateral.innerHTML = '';
      slot.innerHTML = '';
      if (largo.matches) {
        var nav = criar('nav', { classe: 'indice', 'aria-label': t('indiceRotulo') }, [
          criar('p', { classe: 'indice-titulo', texto: t('conteudo') }),
          construirLista(),
        ]);
        lateral.appendChild(nav);
        layout.classList.add('com-indice');
        linksLaterais = Array.prototype.slice.call(nav.querySelectorAll('a[data-alvo]'));
        destacar();
      } else {
        slot.appendChild(criar('details', { classe: 'indice indice-inline' }, [
          criar('summary', { texto: t('conteudo') }),
          criar('nav', { 'aria-label': t('indiceRotulo') }, [construirLista()]),
        ]));
        layout.classList.remove('com-indice');
        linksLaterais = [];
      }
    }

    var agendado = false;
    function destacar() {
      agendado = false;
      if (!linksLaterais.length) return;
      var ativo = null;
      for (var i = 0; i < titulos.length; i++) {
        if (titulos[i].getBoundingClientRect().top < 140) ativo = titulos[i].id;
        else break;
      }
      var noFim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (noFim && ativo) ativo = titulos[titulos.length - 1].id;
      linksLaterais.forEach(function (a) {
        var marcado = a.getAttribute('data-alvo') === ativo;
        a.classList.toggle('ativo', marcado);
        if (marcado) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }

    window.addEventListener('scroll', function () {
      if (!agendado) {
        agendado = true;
        window.requestAnimationFrame(destacar);
      }
    }, { passive: true });

    if (largo.addEventListener) largo.addEventListener('change', posicionar);
    else if (largo.addListener) largo.addListener(posicionar);
    posicionar();
  }

  // ------------------------------------------------------------ quadro de navegação
  function iniciarNavbox() {
    var caixa = document.querySelector('[data-navbox]');
    if (!caixa || !D.pessoas.length) return;
    var atual = document.body.getAttribute('data-pessoa');

    caixa.appendChild(criar('p', { classe: 'navbox-titulo', texto: t('navboxTitulo') }));
    Object.keys(D.categorias).forEach(function (categoria) {
      var membros = D.pessoas.filter(function (p) {
        return p.categorias[0] === categoria;
      });
      if (!membros.length) return;
      caixa.appendChild(criar('div', { classe: 'navbox-linha' }, [
        criar('p', { texto: D.categorias[categoria] }),
        criar('ul', null, membros.map(function (p) {
          return criar('li', null, [
            criar('a', { href: urlPessoa(p), 'aria-current': p.id === atual ? 'page' : null, texto: p.nome }),
          ]);
        })),
      ]));
    });
  }

  // ------------------------------------------------------------ cartões de citação
  function textoCitacao(c) {
    var autor = pessoasPorId[c.autor];
    return '“' + c.texto + '”\n— ' + autor.nome + (c.fonte ? ', ' + c.fonte : '') + '\n' + absoluta(raiz + c.url);
  }

  function compartilharCitacao(c) {
    var autor = pessoasPorId[c.autor];
    compartilhar({ title: autor.nome + ' — ' + D.site, text: '“' + c.texto + '” — ' + autor.nome, url: absoluta(raiz + c.url) });
  }

  function botaoIcone(icone, titulo, acao) {
    var b = criar('button', { type: 'button', classe: 'botao-copiar', 'aria-label': titulo, title: titulo, html: icone });
    b.addEventListener('click', acao);
    return b;
  }

  function iniciarCartoes() {
    document.querySelectorAll('.cartao-pensamento').forEach(function (el) {
      var c = D.pensamentos[Number(el.getAttribute('data-indice'))];
      var acoes = el.querySelector('.cartao-acoes');
      if (!c || !acoes || acoes.children.length) return;
      var autor = pessoasPorId[c.autor];
      acoes.appendChild(botaoIcone(ICONES.compartilhar, t('compartilharDe', { nome: autor.nome }), function () {
        compartilharCitacao(c);
      }));
      if (!c.falsa) {
        acoes.appendChild(botaoIcone(ICONES.copiar, t('copiarDe', { nome: autor.nome }), function () {
          copiar(textoCitacao(c));
        }));
      }
    });
  }

  // ------------------------------------------------------------ modo offline
  function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    var seguro = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!seguro) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(raiz + 'sw.js').catch(function () {
        /* sem modo offline, o site funciona normalmente */
      });
    });
  }

  // ------------------------------------------------------------ início
  iniciarBusca();
  iniciarAleatorio();
  if (pagina === 'artigo') {
    iniciarIndice();
    iniciarNavbox();
  }
  iniciarCartoes();
  carregarRetratos(document);
  registrarServiceWorker();

  window.Pensapedia = {
    D: D,
    t: t,
    raiz: raiz,
    icones: ICONES,
    urlPessoa: urlPessoa,
    url: function (caminho) {
      return raiz + caminho;
    },
    absoluta: absoluta,
    pessoa: function (id) {
      return pessoasPorId[id];
    },
    normalizar: normalizar,
    criar: criar,
    retrato: retrato,
    carregarRetratos: carregarRetratos,
    pesquisar: pesquisar,
    copiar: copiar,
    compartilhar: compartilhar,
    textoCitacao: textoCitacao,
    compartilharCitacao: compartilharCitacao,
    avisar: avisar,
  };
})();
