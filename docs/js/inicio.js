/*
 * Pensapédia — página inicial: pensamento do dia e mural de pensamentos.
 */
(function () {
  'use strict';

  var P = window.Pensapedia;
  if (!P) return;
  var D = P.D;
  var criar = P.criar;

  var pensamentos = D.pensamentos.filter(function (c) {
    return P.pessoa(c.autor);
  });
  if (!pensamentos.length) return;

  // ------------------------------------------------------------ sorteio com semente
  // A mesma semente gera a mesma sequência: assim, o pensamento do dia e a
  // ordem do mural são iguais para todos os visitantes no mesmo dia.
  function gerador(semente) {
    var a = semente >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var hoje = new Date();
  var sementeDoDia = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
  var sorteio = gerador(sementeDoDia);

  var ordem = pensamentos.map(function (_, i) {
    return i;
  });
  for (var i = ordem.length - 1; i > 0; i--) {
    var j = Math.floor(sorteio() * (i + 1));
    var troca = ordem[i];
    ordem[i] = ordem[j];
    ordem[j] = troca;
  }

  function textoParaCopiar(c) {
    return '“' + c.texto + '” — ' + P.pessoa(c.autor).nome + (c.fonte ? ', ' + c.fonte : '');
  }

  function selo(c) {
    return c.rotulo ? criar('span', { classe: 'selo', texto: c.rotulo }) : null;
  }

  // ------------------------------------------------------------ pensamento do dia
  var campoData = document.querySelector('[data-hoje]');
  if (campoData) {
    campoData.textContent = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    campoData.setAttribute('datetime', hoje.toISOString().slice(0, 10));
  }

  var destaque = document.querySelector('[data-destaque]');
  // O pensamento do dia é o último da ordem sorteada, para não repetir o
  // primeiro cartão do mural logo abaixo.
  var atual = ordem[ordem.length - 1];

  function mostrarDestaque(indice) {
    var c = pensamentos[indice];
    var pessoa = P.pessoa(c.autor);
    atual = indice;
    destaque.innerHTML = '';
    destaque.appendChild(criar('blockquote', null, [criar('p', { texto: c.texto })]));
    destaque.appendChild(criar('figcaption', null, [
      P.retrato(pessoa, 'medio'),
      criar('span', null, [
        criar('a', { classe: 'autor-nome', href: P.urlPessoa(pessoa.id), texto: pessoa.nome }),
        criar('span', { classe: 'autor-detalhe' }, [c.fonte, selo(c)]),
      ]),
    ]));
    P.carregarRetratos(destaque);
  }

  if (destaque) {
    mostrarDestaque(atual);

    var botaoOutro = document.querySelector('[data-outro]');
    if (botaoOutro) {
      botaoOutro.addEventListener('click', function () {
        var proximo = atual;
        while (proximo === atual && pensamentos.length > 1) {
          proximo = Math.floor(Math.random() * pensamentos.length);
        }
        destaque.classList.add('trocando');
        setTimeout(function () {
          mostrarDestaque(proximo);
          destaque.classList.remove('trocando');
        }, 220);
      });
    }

    var botaoCopiar = document.querySelector('[data-copiar-destaque]');
    if (botaoCopiar) {
      botaoCopiar.addEventListener('click', function () {
        P.copiar(textoParaCopiar(pensamentos[atual]));
      });
    }
  }

  // ------------------------------------------------------------ mural
  var mural = document.querySelector('[data-mural]');
  var caixaTemas = document.querySelector('[data-temas]');
  var contagem = document.querySelector('[data-contagem]');
  if (!mural) return;

  var autores = {};
  pensamentos.forEach(function (c) {
    autores[c.autor] = true;
  });

  var ICONE_COPIAR = '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>';

  function cartao(c) {
    var pessoa = P.pessoa(c.autor);
    var botao = criar('button', { type: 'button', classe: 'botao-copiar', 'aria-label': 'Copiar pensamento de ' + pessoa.nome });
    botao.innerHTML = ICONE_COPIAR + '<span>Copiar</span>';
    botao.addEventListener('click', function () {
      P.copiar(textoParaCopiar(c));
    });

    return criar('figure', { classe: 'cartao-pensamento', 'data-tema': c.tema }, [
      criar('blockquote', null, [criar('p', { texto: c.texto })]),
      criar('figcaption', null, [
        criar('div', { classe: 'cartao-linha-autor' }, [
          P.retrato(pessoa, 'mini'),
          criar('span', { classe: 'cartao-autor' }, [
            criar('a', { href: P.urlPessoa(pessoa.id), texto: pessoa.nome }),
            criar('span', { classe: 'cartao-fonte' }, [c.fonte, selo(c)]),
          ]),
        ]),
        criar('div', { classe: 'cartao-rodape' }, [
          criar('span', { classe: 'tema-etiqueta', texto: D.temas[c.tema] || '' }),
          botao,
        ]),
      ]),
    ]);
  }

  var cartoes = ordem.map(function (indice) {
    var el = cartao(pensamentos[indice]);
    mural.appendChild(el);
    return el;
  });

  var vazio = criar('p', { classe: 'mural-vazio', hidden: true, texto: 'Nenhum pensamento neste tema.' });
  mural.after(vazio);

  var POR_VEZ = 24;
  var limite = POR_VEZ;
  var temaAtivo = 'todos';
  var botaoMais = document.querySelector('[data-mais]');

  function lerTemaDaUrl() {
    var m = /(?:^|&)tema=([a-z]+)/.exec(window.location.hash.slice(1));
    return m && D.temas[m[1]] ? m[1] : 'todos';
  }

  var botoesTema = [];

  function aplicarTema(tema, manterLimite) {
    if (!manterLimite) limite = POR_VEZ;
    temaAtivo = tema;
    var visiveis = 0;
    cartoes.forEach(function (el) {
      var doTema = tema === 'todos' || el.getAttribute('data-tema') === tema;
      if (doTema) visiveis += 1;
      el.hidden = !doTema || visiveis > limite;
    });
    if (botaoMais) {
      var restantes = visiveis - limite;
      botaoMais.hidden = restantes <= 0;
      botaoMais.textContent = 'Mostrar mais pensamentos (' + Math.max(restantes, 0) + ')';
    }
    botoesTema.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-tema') === tema ? 'true' : 'false');
    });
    vazio.hidden = visiveis > 0;
    if (contagem) {
      var total = Object.keys(autores).length;
      contagem.textContent = tema === 'todos'
        ? pensamentos.length + ' pensamentos de ' + total + ' personalidades'
        : visiveis + ' de ' + pensamentos.length + ' pensamentos · ' + D.temas[tema];
    }
  }

  if (caixaTemas) {
    var porTema = {};
    pensamentos.forEach(function (c) {
      porTema[c.tema] = (porTema[c.tema] || 0) + 1;
    });
    var opcoes = [['todos', 'Todos', pensamentos.length]].concat(
      Object.keys(D.temas).filter(function (t) {
        return porTema[t];
      }).map(function (t) {
        return [t, D.temas[t], porTema[t]];
      })
    );
    opcoes.forEach(function (op) {
      var b = criar('button', { type: 'button', classe: 'chip', 'data-tema': op[0], 'aria-pressed': 'false' }, [
        op[1],
        criar('span', { classe: 'chip-contagem', texto: String(op[2]) }),
      ]);
      b.addEventListener('click', function () {
        aplicarTema(op[0]);
        var novoHash = op[0] === 'todos' ? '' : '#tema=' + op[0];
        try {
          history.replaceState(null, '', window.location.pathname + window.location.search + novoHash);
        } catch (e) {
          /* ignora ambientes sem history */
        }
      });
      botoesTema.push(b);
      caixaTemas.appendChild(b);
    });
  }

  if (botaoMais) {
    botaoMais.addEventListener('click', function () {
      var primeiroNovo = null;
      limite += POR_VEZ;
      aplicarTema(temaAtivo, true);
      var contador = 0;
      cartoes.some(function (el) {
        if (temaAtivo === 'todos' || el.getAttribute('data-tema') === temaAtivo) contador += 1;
        if (contador === limite - POR_VEZ + 1) {
          primeiroNovo = el;
          return true;
        }
        return false;
      });
      if (primeiroNovo) {
        var link = primeiroNovo.querySelector('a');
        if (link) link.focus({ preventScroll: true });
      }
    });
  }

  aplicarTema(lerTemaDaUrl());
  window.addEventListener('hashchange', function () {
    if (botaoMais) {
    botaoMais.addEventListener('click', function () {
      var primeiroNovo = null;
      limite += POR_VEZ;
      aplicarTema(temaAtivo, true);
      var contador = 0;
      cartoes.some(function (el) {
        if (temaAtivo === 'todos' || el.getAttribute('data-tema') === temaAtivo) contador += 1;
        if (contador === limite - POR_VEZ + 1) {
          primeiroNovo = el;
          return true;
        }
        return false;
      });
      if (primeiroNovo) {
        var link = primeiroNovo.querySelector('a');
        if (link) link.focus({ preventScroll: true });
      }
    });
  }

  aplicarTema(lerTemaDaUrl());
  });

  P.carregarRetratos(mural);
})();
