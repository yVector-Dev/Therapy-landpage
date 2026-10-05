/*
 * Pensapédia — página de citação: copiar, compartilhar e gerar uma imagem
 * vertical (1080 × 1350, formato de stories e feed) com a frase e o autor.
 */
(function () {
  'use strict';

  var P = window.Pensapedia;
  if (!P) return;
  var D = P.D;
  var t = P.t;

  var figura = document.querySelector('[data-citacao]');
  var acoes = document.querySelector('[data-acoes-citacao]');
  if (!figura || !acoes) return;

  var texto = figura.querySelector('blockquote').textContent.trim();
  var autor = figura.getAttribute('data-autor');
  var fonte = figura.getAttribute('data-fonte');
  var falsa = figura.classList.contains('citacao-falsa');
  var canonico = document.querySelector('link[rel="canonical"]');
  var endereco = canonico ? canonico.href : window.location.href;

  function ao(seletor, acao) {
    var b = acoes.querySelector(seletor);
    if (b) b.addEventListener('click', acao);
  }

  ao('[data-copiar-texto]', function () {
    P.copiar('“' + texto + '”\n— ' + autor + (fonte && !falsa ? ', ' + fonte : '') + '\n' + endereco);
  });
  ao('[data-copiar-link]', function () {
    P.copiar(endereco, t('linkCopiado'));
  });
  ao('[data-compartilhar]', function () {
    P.compartilhar({ title: document.title, text: '“' + texto + '” — ' + autor, url: endereco });
  });
  ao('[data-imagem]', gerarImagem);

  // ------------------------------------------------------------ imagem
  var CORUJA = 'M11 15.5 9.6 5.8l7.6 5.6Q20.4 10 24 10t6.8 1.4l7.6-5.6-1.4 9.7q3 4.4 3 10.5C40 36.4 32.8 43 24 43S8 36.4 8 26q0-6.1 3-10.5Z';

  function quebrarLinhas(ctx, frase, largura) {
    var palavras = frase.split(/\s+/);
    var linhas = [];
    var atual = '';
    palavras.forEach(function (p) {
      var teste = atual ? atual + ' ' + p : p;
      if (ctx.measureText(teste).width > largura && atual) {
        linhas.push(atual);
        atual = p;
      } else {
        atual = teste;
      }
    });
    if (atual) linhas.push(atual);
    return linhas;
  }

  function desenhar() {
    var L = 1080;
    var A = 1350;
    var canvas = document.createElement('canvas');
    canvas.width = L;
    canvas.height = A;
    var ctx = canvas.getContext('2d');

    var cores = { fundo: '#f5f2eb', moldura: '#d9cfbd', texto: '#1f1b16', suave: '#5d5549', bronze: '#8a5a14', alerta: '#9b2c2c' };

    ctx.fillStyle = cores.fundo;
    ctx.fillRect(0, 0, L, A);
    ctx.strokeStyle = cores.moldura;
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, L - 96, A - 96);

    // Marca: coruja + nome
    ctx.save();
    ctx.translate(100, 96);
    ctx.scale(1.6, 1.6);
    ctx.fillStyle = cores.bronze;
    ctx.fill(new Path2D(CORUJA));
    ctx.fillStyle = cores.fundo;
    [[17.6, 22], [30.4, 22]].forEach(function (o) {
      ctx.beginPath();
      ctx.arc(o[0], o[1], 6.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = cores.texto;
    [[17.6, 22], [30.4, 22]].forEach(function (o) {
      ctx.beginPath();
      ctx.arc(o[0], o[1], 2.7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    ctx.fillStyle = cores.texto;
    ctx.font = '500 46px "EB Garamond", Georgia, serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(D.site, 190, 136);

    if (falsa) {
      ctx.fillStyle = cores.alerta;
      ctx.font = '700 30px "Source Sans 3", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(fonte.toUpperCase(), L - 100, 136);
      ctx.textAlign = 'left';
    }

    // Aspas decorativas
    ctx.fillStyle = cores.bronze;
    ctx.globalAlpha = 0.35;
    ctx.font = '400 260px "EB Garamond", Georgia, serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('“', 84, 420);
    ctx.globalAlpha = 1;

    // Frase: diminui a fonte até caber
    var larguraTexto = L - 220;
    var tamanho = 78;
    var linhas;
    var altura;
    do {
      ctx.font = 'italic 400 ' + tamanho + 'px "EB Garamond", Georgia, serif';
      linhas = quebrarLinhas(ctx, texto, larguraTexto);
      altura = linhas.length * tamanho * 1.25;
      tamanho -= 2;
    } while (altura > 700 && tamanho > 30);
    tamanho += 2;

    var y = 330 + Math.max(0, (700 - altura) / 2);
    ctx.fillStyle = cores.texto;
    linhas.forEach(function (linha) {
      y += tamanho * 1.25;
      ctx.fillText(linha, 110, y);
    });

    // Autor e fonte
    y = Math.max(y + 90, 1080);
    ctx.fillStyle = cores.bronze;
    ctx.fillRect(110, y - 34, 64, 4);
    ctx.fillStyle = cores.texto;
    ctx.font = '700 44px "Source Sans 3", system-ui, sans-serif';
    ctx.fillText(autor, 110, y + 30);
    if (fonte && !falsa) {
      ctx.fillStyle = cores.suave;
      ctx.font = '400 30px "Source Sans 3", system-ui, sans-serif';
      quebrarLinhas(ctx, fonte, L - 220).slice(0, 2).forEach(function (linha, i) {
        ctx.fillText(linha, 110, y + 80 + i * 40);
      });
    }

    ctx.fillStyle = cores.suave;
    ctx.font = '600 26px "Source Sans 3", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(D.endereco, L - 100, A - 92);
    return canvas;
  }

  function gerarImagem() {
    P.avisar(t('gerandoImagem'));
    var fontes = document.fonts && document.fonts.load
      ? Promise.all([
        document.fonts.load('italic 400 60px "EB Garamond"'),
        document.fonts.load('500 46px "EB Garamond"'),
        document.fonts.load('700 44px "Source Sans 3"'),
        document.fonts.load('400 30px "Source Sans 3"'),
      ]).catch(function () {})
      : Promise.resolve();

    fontes.then(function () {
      var canvas = desenhar();
      canvas.toBlob(function (blob) {
        if (!blob) {
          P.avisar(t('erroImagem'));
          return;
        }
        var nome = 'pensapedia-' + (window.location.pathname.split('/').filter(Boolean).pop() || 'citacao') + '.png';
        var arquivo = typeof File === 'function' ? new File([blob], nome, { type: 'image/png' }) : null;
        if (arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
          navigator.share({ files: [arquivo], title: document.title, text: endereco }).catch(function () {});
          return;
        }
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        setTimeout(function () {
          URL.revokeObjectURL(link.href);
          link.remove();
        }, 1000);
        P.avisar(t('imagemPronta'));
      }, 'image/png');
    });
  }
})();
