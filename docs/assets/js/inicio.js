/*
 * Pensapédia — página inicial: pensamento do dia e mural de pensamentos.
 * Os cartões já vêm no HTML; este script embaralha a ordem do dia,
 * pagina, filtra por tema e acrescenta os botões de copiar e compartilhar.
 */
(function () {
  'use strict';

  var P = window.Pensapedia;
  if (!P) return;
  var D = P.D;
  var criar = P.criar;
  var t = P.t;

  // ------------------------------------------------------------ sorteio com semente
  // A mesma semente gera a mesma sequência: o pensamento do dia e a ordem do
  // mural são iguais para todos os visitantes no mesmo dia.
  function gerador(semente) {
    var a = semente >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var x = a;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function embaralhar(lista, sorteio) {
    var copia = lista.slice();
    for (var i = copia.length - 1; i > 0; i--) {
      var j = Math.floor(sorteio() * (i + 1));
      var troca = copia[i];
      copia[i] = copia[j];
      copia[j] = troca;
    }
    return copia;
  }

  var hoje = new Date();
  var sementeDoDia = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();

  // ------------------------------------------------------------ mural
  var mural = document.querySelector('[data-mural]');
  var cartoes = mural ? Array.prototype.slice.call(mural.querySelectorAll('.cartao-pensamento')) : [];
  var doMural = cartoes.map(function (el) {
    return D.pensamentos[Number(el.getAttribute('data-indice'))];
  });

  if (mural && cartoes.length) {
    cartoes = embaralhar(cartoes, gerador(sementeDoDia));
    cartoes.forEach(function (el) {
      mural.appendChild(el);
    });
  }

  // ------------------------------------------------------------ pensamento do dia
  var campoData = document.querySelector('[data-hoje]');
  if (campoData) {
    campoData.textContent = hoje.toLocaleDateString(D.locale, { day: 'numeric', month: 'long' });
    campoData.setAttribute('datetime', hoje.toISOString().slice(0, 10));
  }

  var destaque = document.querySelector('[data-destaque]');
  var opcoesDestaque = doMural.filter(Boolean);
  // O pensamento do dia é o último do embaralhamento, para não repetir o
  // primeiro cartão do mural logo abaixo.
  var atual = cartoes.length ? D.pensamentos[Number(cartoes[cartoes.length - 1].getAttribute('data-indice'))] : opcoesDestaque[0];

  function mostrarDestaque(c) {
    var autor = P.pessoa(c.autor);
    atual = c;
    destaque.innerHTML = '';
    destaque.appendChild(criar('blockquote', null, [
      criar('p', null, [criar('a', { classe: 'cartao-link', href: P.url(c.url), texto: c.texto })]),
    ]));
    destaque.appendChild(criar('figcaption', null, [
      P.retrato(autor, 'medio'),
      criar('span', null, [
        criar('a', { classe: 'autor-nome', href: P.urlPessoa(autor), texto: autor.nome }),
        criar('span', { classe: 'autor-detalhe' }, [
          c.fonte,
          c.rotulo ? ' ' : null,
          c.rotulo ? criar('span', { classe: 'selo', texto: c.rotulo }) : null,
        ]),
      ]),
    ]));
    P.carregarRetratos(destaque);
  }

  if (destaque && atual) {
    mostrarDestaque(atual);

    var botaoOutro = document.querySelector('[data-outro]');
    if (botaoOutro) {
      botaoOutro.addEventListener('click', function () {
        var proximo = atual;
        while (proximo === atual && opcoesDestaque.length > 1) {
          proximo = opcoesDestaque[Math.floor(Math.random() * opcoesDestaque.length)];
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
        P.copiar(P.textoCitacao(atual));
      });
    }
    var botaoCompartilhar = document.querySelector('[data-compartilhar-destaque]');
    if (botaoCompartilhar) {
      botaoCompartilhar.addEventListener('click', function () {
        P.compartilharCitacao(atual);
      });
    }
  }

  if (!mural) return;

  // ------------------------------------------------------------ filtros e paginação
  var contagem = document.querySelector('[data-contagem]');
  var botaoMais = document.querySelector('[data-mais]');
  var botoesTema = Array.prototype.slice.call(document.querySelectorAll('[data-temas] .chip'));
  var totalAutores = {};
  doMural.forEach(function (c) {
    if (c) totalAutores[c.autor] = true;
  });

  var vazio = criar('p', { classe: 'mural-vazio', hidden: true, texto: t('nenhumTema') });
  mural.after(vazio);

  var POR_VEZ = 24;
  var limite = POR_VEZ;
  var temaAtivo = 'todos';

  function aplicarTema(tema, manterLimite) {
    if (!manterLimite) limite = POR_VEZ;
    temaAtivo = tema;
    var visiveis = 0;
    cartoes.forEach(function (el) {
      var doTema = tema === 'todos' || el.getAttribute('data-tema') === tema;
      if (doTema) visiveis += 1;
      el.hidden = !doTema || visiveis > limite;
    });
    botoesTema.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-tema') === tema ? 'true' : 'false');
    });
    vazio.hidden = visiveis > 0;
    if (botaoMais) {
      var restantes = visiveis - limite;
      botaoMais.hidden = restantes <= 0;
      botaoMais.textContent = t('mostrarMais', { n: Math.max(restantes, 0) });
    }
    if (contagem) {
      contagem.textContent = tema === 'todos'
        ? t('contagemTodos', { n: cartoes.length, m: Object.keys(totalAutores).length })
        : t('contagemTema', { v: visiveis, n: cartoes.length, tema: D.temas[tema] });
    }
  }

  function lerTemaDaUrl() {
    var m = /(?:^|&)tema=([a-z]+)/.exec(window.location.hash.slice(1));
    return m && D.temas[m[1]] ? m[1] : 'todos';
  }

  botoesTema.forEach(function (b) {
    b.addEventListener('click', function () {
      var tema = b.getAttribute('data-tema');
      aplicarTema(tema);
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search + (tema === 'todos' ? '' : '#tema=' + tema));
      } catch (e) {
        /* ambiente sem history */
      }
    });
  });

  if (botaoMais) {
    botaoMais.addEventListener('click', function () {
      var anterior = limite;
      limite += POR_VEZ;
      aplicarTema(temaAtivo, true);
      var contador = 0;
      cartoes.some(function (el) {
        if (temaAtivo === 'todos' || el.getAttribute('data-tema') === temaAtivo) contador += 1;
        if (contador === anterior + 1) {
          var link = el.querySelector('a');
          if (link) link.focus({ preventScroll: true });
          return true;
        }
        return false;
      });
    });
  }

  aplicarTema(lerTemaDaUrl());
  window.addEventListener('hashchange', function () {
    aplicarTema(lerTemaDaUrl());
  });
})();
