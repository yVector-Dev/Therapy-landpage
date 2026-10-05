/*
 * Pensapédia — comportamento comum a todas as páginas:
 * tema claro/escuro, busca, artigo aleatório, retratos, índice dos artigos
 * e quadro de navegação.
 */
(function () {
  'use strict';

  var D = window.PENSAPEDIA || { categorias: {}, temas: {}, pessoas: [], pensamentos: [] };
  var raiz = document.body.getAttribute('data-raiz') || '';
  var pagina = document.body.getAttribute('data-pagina') || '';

  var pessoasPorId = {};
  D.pessoas.forEach(function (p) {
    pessoasPorId[p.id] = p;
  });

  // ------------------------------------------------------------ utilidades
  function urlPessoa(id) {
    return raiz + 'personalidades/' + id + '.html';
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

  function idAtual() {
    if (pagina !== 'artigo') return null;
    var arquivo = window.location.pathname.split('/').pop() || '';
    return decodeURIComponent(arquivo.replace(/\.html?$/, ''));
  }

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

  function copiar(texto) {
    function alternativa() {
      var campo = criar('textarea', { 'aria-hidden': 'true' });
      campo.value = texto;
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      campo.remove();
      avisar(ok ? 'Pensamento copiado' : 'Não foi possível copiar');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(function () {
        avisar('Pensamento copiado');
      }, alternativa);
    } else {
      alternativa();
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

  // ------------------------------------------------------------ retratos
  // Mostra a inicial da pessoa e, quando possível, troca pelo retrato
  // principal do artigo correspondente na Wikipédia (Wikimedia Commons).
  function inicial(nome) {
    return nome.replace(/^(Santo|São|Santa)\s+/, '').charAt(0);
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
        titulos.forEach(function (t) {
          destino[t] = t;
        });
        (consulta.normalized || []).concat(consulta.redirects || []).forEach(function (troca) {
          titulos.forEach(function (t) {
            if (destino[t] === troca.from) destino[t] = troca.to;
          });
        });
        var imagens = {};
        (consulta.pages || []).forEach(function (p) {
          imagens[p.title] = p.thumbnail ? p.thumbnail.source : null;
        });
        titulos.forEach(function (t) {
          cacheRetratos.urls[t] = imagens[destino[t]] || null;
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
    img.alt = alvo.classList.contains('retrato-grande') ? 'Retrato de ' + (alvo.getAttribute('data-nome') || '') : '';
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

    var esperas = [];
    for (var i = 0; i < faltam.length; i += 50) {
      var lote = faltam.slice(i, i + 50).filter(function (t) {
        return !buscasPendentes[t];
      });
      if (lote.length) {
        var promessa = consultarWikipedia(lote);
        lote.forEach(function (t) {
          buscasPendentes[t] = promessa;
        });
      }
    }
    faltam.forEach(function (t) {
      if (buscasPendentes[t] && esperas.indexOf(buscasPendentes[t]) === -1) esperas.push(buscasPendentes[t]);
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
    var t = normalizar(termo).trim();
    if (!t) return [];
    var palavras = t.split(/\s+/);
    var resultados = [];
    D.pessoas.forEach(function (p) {
      var nome = normalizar(p.nome);
      var resto = normalizar([p.area, p.resumo, p.datas].join(' '));
      var pontos = 0;
      var todas = palavras.every(function (palavra) {
        if (nome.indexOf(palavra) === 0) pontos += 6;
        else if (new RegExp('\\b' + palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(nome)) pontos += 4;
        else if (nome.indexOf(palavra) !== -1) pontos += 2;
        else if (resto.indexOf(palavra) !== -1) pontos += 1;
        else return false;
        return true;
      });
      if (todas) resultados.push({ pessoa: p, pontos: pontos });
    });
    resultados.sort(function (a, b) {
      return b.pontos - a.pontos || a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt');
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
        lista.appendChild(criar('li', { classe: 'busca-vazia', role: 'option', 'aria-disabled': 'true', texto: 'Nenhuma personalidade encontrada.' }));
      }
      itens.forEach(function (p, i) {
        lista.appendChild(criar('li', { id: 'sugestao-' + i, role: 'option', 'aria-selected': 'false' }, [
          criar('a', { href: urlPessoa(p.id), tabindex: '-1' }, [
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
        window.location.href = urlPessoa(escolhido.id);
      }
    });

    document.addEventListener('click', function (evento) {
      if (!form.contains(evento.target)) fechar();
    });
  }

  // ------------------------------------------------------------ artigo aleatório
  function iniciarAleatorio() {
    document.querySelectorAll('[data-aleatorio]').forEach(function (link) {
      link.addEventListener('click', function (evento) {
        var atual = idAtual();
        var opcoes = D.pessoas.filter(function (p) {
          return p.id !== atual;
        });
        if (!opcoes.length) return;
        evento.preventDefault();
        var p = opcoes[Math.floor(Math.random() * opcoes.length)];
        window.location.href = urlPessoa(p.id);
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
      return !h.closest('.infobox, .navbox');
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

    function construirLista() {
      var raizLista = criar('ol');
      raizLista.appendChild(criar('li', null, [criar('a', { href: '#conteudo', texto: '(Início)' })]));
      var n2 = 0;
      var n3 = 0;
      var subLista = null;
      var itemAtual = null;
      titulos.forEach(function (h) {
        var nivel3 = h.tagName === 'H3';
        if (!nivel3 || !itemAtual) {
          n2 += 1;
          n3 = 0;
          subLista = null;
          itemAtual = criar('li', null, [
            criar('a', { href: '#' + h.id, 'data-alvo': h.id }, [
              criar('span', { classe: 'indice-num', texto: String(n2) }), ' ' + h.textContent,
            ]),
          ]);
          raizLista.appendChild(itemAtual);
        } else {
          if (!subLista) {
            subLista = criar('ol');
            itemAtual.appendChild(subLista);
          }
          n3 += 1;
          subLista.appendChild(criar('li', null, [
            criar('a', { href: '#' + h.id, 'data-alvo': h.id }, [
              criar('span', { classe: 'indice-num', texto: n2 + '.' + n3 }), ' ' + h.textContent,
            ]),
          ]));
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
        var nav = criar('nav', { classe: 'indice', 'aria-label': 'Índice do artigo' }, [
          criar('p', { classe: 'indice-titulo', texto: 'Conteúdo' }),
          construirLista(),
        ]);
        lateral.appendChild(nav);
        layout.classList.add('com-indice');
        linksLaterais = Array.prototype.slice.call(nav.querySelectorAll('a[data-alvo]'));
        destacar();
      } else {
        slot.appendChild(criar('details', { classe: 'indice indice-inline' }, [
          criar('summary', { texto: 'Conteúdo' }),
          criar('nav', { 'aria-label': 'Índice do artigo' }, [construirLista()]),
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
      linksLaterais.forEach(function (link) {
        var marcado = link.getAttribute('data-alvo') === ativo;
        link.classList.toggle('ativo', marcado);
        if (marcado) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
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
    var atual = idAtual();

    caixa.appendChild(criar('p', { classe: 'navbox-titulo', texto: 'Personalidades da Pensapédia' }));
    Object.keys(D.categorias).forEach(function (categoria) {
      var membros = D.pessoas.filter(function (p) {
        return p.categorias[0] === categoria;
      });
      if (!membros.length) return;
      caixa.appendChild(criar('div', { classe: 'navbox-linha' }, [
        criar('p', { texto: D.categorias[categoria] }),
        criar('ul', null, membros.map(function (p) {
          return criar('li', null, [
            criar('a', { href: urlPessoa(p.id), 'aria-current': p.id === atual ? 'page' : null, texto: p.nome }),
          ]);
        })),
      ]));
    });
  }

  // ------------------------------------------------------------ início
  iniciarBusca();
  iniciarAleatorio();
  if (pagina === 'artigo') {
    iniciarIndice();
    iniciarNavbox();
  }
  carregarRetratos(document);

  window.Pensapedia = {
    D: D,
    raiz: raiz,
    urlPessoa: urlPessoa,
    pessoa: function (id) {
      return pessoasPorId[id];
    },
    normalizar: normalizar,
    criar: criar,
    retrato: retrato,
    carregarRetratos: carregarRetratos,
    pesquisar: pesquisar,
    copiar: copiar,
    avisar: avisar,
  };
})();
