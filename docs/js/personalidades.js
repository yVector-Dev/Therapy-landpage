/*
 * Pensapédia — página "Personalidades": lista com filtro, categorias e ordenação.
 */
(function () {
  'use strict';

  var P = window.Pensapedia;
  if (!P) return;
  var D = P.D;
  var criar = P.criar;

  var lista = document.querySelector('[data-lista]');
  var resumo = document.querySelector('[data-resumo]');
  var campo = document.querySelector('[data-filtro-texto]');
  var caixaCategorias = document.querySelector('[data-filtro-categorias]');
  var botoesOrdem = Array.prototype.slice.call(document.querySelectorAll('[data-ordem]'));
  if (!lista) return;

  var ERAS = [
    { ate: 476, nome: 'Antiguidade' },
    { ate: 1400, nome: 'Idade Média' },
    { ate: 1800, nome: 'Renascimento e Idade Moderna' },
    { ate: Infinity, nome: 'Idade Contemporânea' },
  ];

  var parametros = new URLSearchParams(window.location.search);
  var estado = {
    texto: parametros.get('q') || '',
    categoria: D.categorias[parametros.get('categoria')] ? parametros.get('categoria') : 'todas',
    ordem: parametros.get('ordem') === 'alfabetica' ? 'alfabetica' : 'cronologica',
  };

  if (campo) campo.value = estado.texto;

  // ------------------------------------------------------------ categorias
  var botoesCategoria = [];
  if (caixaCategorias) {
    var opcoes = [['todas', 'Todas', D.pessoas.length]].concat(Object.keys(D.categorias).map(function (c) {
      return [c, D.categorias[c], D.pessoas.filter(function (p) {
        return p.categorias.indexOf(c) !== -1;
      }).length];
    }));
    opcoes.forEach(function (op) {
      if (!op[2]) return;
      var b = criar('button', { type: 'button', classe: 'chip', 'data-categoria': op[0], 'aria-pressed': 'false' }, [
        op[1],
        criar('span', { classe: 'chip-contagem', texto: String(op[2]) }),
      ]);
      b.addEventListener('click', function () {
        estado.categoria = op[0];
        desenhar();
      });
      botoesCategoria.push(b);
      caixaCategorias.appendChild(b);
    });
  }

  botoesOrdem.forEach(function (b) {
    b.addEventListener('click', function () {
      estado.ordem = b.getAttribute('data-ordem');
      desenhar();
    });
  });

  var espera = null;
  if (campo) {
    campo.addEventListener('input', function () {
      clearTimeout(espera);
      espera = setTimeout(function () {
        estado.texto = campo.value;
        desenhar();
      }, 120);
    });
  }

  // ------------------------------------------------------------ desenho
  function cartaoPessoa(p) {
    return criar('li', null, [
      criar('a', { classe: 'cartao-pessoa', href: P.urlPessoa(p.id) }, [
        P.retrato(p, 'medio'),
        criar('div', { classe: 'cartao-pessoa-texto' }, [
          criar('h3', { texto: p.nome }),
          criar('p', { classe: 'cartao-pessoa-meta', texto: p.datas + ' · ' + p.area }),
          criar('p', { classe: 'cartao-pessoa-resumo', texto: p.resumo }),
        ]),
      ]),
    ]);
  }

  function grupo(titulo, pessoas) {
    return criar('section', { classe: 'grupo', 'aria-label': titulo }, [
      criar('h2', { classe: 'grupo-titulo' }, [
        titulo,
        criar('small', { texto: pessoas.length === 1 ? '1 personalidade' : pessoas.length + ' personalidades' }),
      ]),
      criar('ul', { classe: 'grade-pessoas' }, pessoas.map(cartaoPessoa)),
    ]);
  }

  function atualizarUrl() {
    var p = new URLSearchParams();
    if (estado.texto.trim()) p.set('q', estado.texto.trim());
    if (estado.categoria !== 'todas') p.set('categoria', estado.categoria);
    if (estado.ordem !== 'cronologica') p.set('ordem', estado.ordem);
    var consulta = p.toString();
    try {
      history.replaceState(null, '', window.location.pathname + (consulta ? '?' + consulta : ''));
    } catch (e) {
      /* ignora ambientes sem history */
    }
  }

  function desenhar() {
    var pessoas = estado.texto.trim() ? P.pesquisar(estado.texto) : D.pessoas.slice();
    if (estado.categoria !== 'todas') {
      pessoas = pessoas.filter(function (p) {
        return p.categorias.indexOf(estado.categoria) !== -1;
      });
    }

    botoesCategoria.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-categoria') === estado.categoria ? 'true' : 'false');
    });
    botoesOrdem.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-ordem') === estado.ordem ? 'true' : 'false');
    });

    lista.innerHTML = '';
    var grupos = [];

    if (estado.ordem === 'alfabetica') {
      pessoas.sort(function (a, b) {
        return a.nome.localeCompare(b.nome, 'pt');
      });
      pessoas.forEach(function (p) {
        var letra = P.normalizar(p.nome).charAt(0).toUpperCase();
        var ultimo = grupos[grupos.length - 1];
        if (!ultimo || ultimo.titulo !== letra) grupos.push({ titulo: letra, pessoas: [p] });
        else ultimo.pessoas.push(p);
      });
    } else {
      pessoas.sort(function (a, b) {
        return a.ano - b.ano;
      });
      ERAS.forEach(function (era, i) {
        var inicio = i === 0 ? -Infinity : ERAS[i - 1].ate;
        var membros = pessoas.filter(function (p) {
          return p.ano >= inicio && p.ano < era.ate;
        });
        if (membros.length) grupos.push({ titulo: era.nome, pessoas: membros });
      });
    }

    grupos.forEach(function (g) {
      lista.appendChild(grupo(g.titulo, g.pessoas));
    });

    if (resumo) {
      if (!pessoas.length) {
        resumo.textContent = estado.texto.trim()
          ? 'Nenhuma personalidade encontrada para “' + estado.texto.trim() + '”.'
          : 'Nenhuma personalidade nesta categoria.';
      } else if (pessoas.length === D.pessoas.length) {
        resumo.textContent = D.pessoas.length + ' personalidades, em ordem ' +
          (estado.ordem === 'alfabetica' ? 'alfabética.' : 'cronológica de nascimento.');
      } else {
        resumo.textContent = 'Mostrando ' + pessoas.length + ' de ' + D.pessoas.length + ' personalidades.';
      }
    }

    atualizarUrl();
    P.carregarRetratos(lista);
  }

  desenhar();
})();
