/*
 * Pensapédia — página de personalidades: filtro, categorias e ordenação.
 * A lista já vem no HTML; o script a redesenha quando o leitor filtra.
 */
(function () {
  'use strict';

  var P = window.Pensapedia;
  if (!P) return;
  var D = P.D;
  var criar = P.criar;
  var t = P.t;

  var lista = document.querySelector('[data-lista]');
  var resumo = document.querySelector('[data-resumo]');
  var campo = document.querySelector('[data-filtro-texto]');
  var botoesCategoria = Array.prototype.slice.call(document.querySelectorAll('[data-filtro-categorias] .chip'));
  var botoesOrdem = Array.prototype.slice.call(document.querySelectorAll('[data-ordem]'));
  if (!lista) return;

  var parametros = new URLSearchParams(window.location.search);
  var estado = {
    texto: parametros.get('q') || '',
    categoria: D.categorias[parametros.get('categoria')] ? parametros.get('categoria') : 'todas',
    ordem: parametros.get('ordem') === 'alfabetica' ? 'alfabetica' : 'cronologica',
  };
  if (campo) campo.value = estado.texto;

  botoesCategoria.forEach(function (b) {
    b.addEventListener('click', function () {
      estado.categoria = b.getAttribute('data-categoria');
      desenhar();
    });
  });

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

  function cartaoPessoa(p) {
    return criar('li', null, [
      criar('a', { classe: 'cartao-pessoa', href: P.urlPessoa(p) }, [
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
        criar('small', { texto: pessoas.length === 1 ? t('umaPessoa') : t('nPessoas', { n: pessoas.length }) }),
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
      /* ambiente sem history */
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
        return a.nome.localeCompare(b.nome, D.locale);
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
      var inicio = -Infinity;
      D.eras.forEach(function (era) {
        var fim = era.ate === null ? Infinity : era.ate;
        var membros = pessoas.filter(function (p) {
          return p.ano >= inicio && p.ano < fim;
        });
        if (membros.length) grupos.push({ titulo: era.nome, pessoas: membros });
        inicio = fim;
      });
    }

    grupos.forEach(function (g) {
      lista.appendChild(grupo(g.titulo, g.pessoas));
    });

    if (resumo) {
      if (!pessoas.length) {
        resumo.textContent = estado.texto.trim()
          ? t('nenhumaPara', { q: estado.texto.trim() })
          : t('nenhumaCategoria');
      } else if (pessoas.length === D.pessoas.length) {
        resumo.textContent = t(estado.ordem === 'alfabetica' ? 'listaAlfa' : 'listaCrono', { n: D.pessoas.length });
      } else {
        resumo.textContent = t('mostrando', { v: pessoas.length, n: D.pessoas.length });
      }
    }

    atualizarUrl();
    P.carregarRetratos(lista);
  }

  // A lista do HTML já está na ordem padrão; só redesenha se a URL pedir outra coisa.
  if (estado.texto || estado.categoria !== 'todas' || estado.ordem !== 'cronologica') desenhar();
})();
