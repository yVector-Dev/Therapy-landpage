/*
 * Pensapédia — configuração do site.
 *
 * Depois de mudar qualquer valor, rode `node src/construir.mjs` para gerar
 * de novo a pasta docs/. Campos vazios desligam o recurso correspondente:
 * nada aparece no site até que ele seja configurado.
 */
export default {
  // Endereço público do site, sem barra no final. Troque ao usar um domínio
  // próprio (ex.: 'https://pensapedia.com'). É usado nos links canônicos,
  // no sitemap e nas imagens de compartilhamento.
  url: 'https://yvector-dev.github.io/Therapy-landpage',

  // Data da última revisão do conteúdo (aparece nos artigos e no sitemap).
  atualizado: '2026-10-05',

  // Idiomas publicados, na ordem em que aparecem no seletor. O primeiro é o
  // idioma de reserva quando o navegador do visitante usa outra língua.
  idiomas: ['en', 'pt', 'es'],

  // E-mail de contato exibido nas páginas Sobre, Privacidade e Termos.
  contato: '',

  // Nome de quem responde pelo site (pessoa ou empresa), citado nas páginas legais.
  responsavel: '',

  // Estatísticas de acesso sem cookies (não exigem aviso de consentimento).
  analytics: {
    plausible: '', // domínio cadastrado no Plausible, ex.: 'pensapedia.com'
    cloudflare: '', // token do Cloudflare Web Analytics
  },

  // Google AdSense. Ative só depois de aprovado. No painel do AdSense, ligue
  // a mensagem de consentimento do Google (exigida na Europa e no Reino Unido).
  anuncios: {
    ativo: false,
    cliente: '', // ex.: 'ca-pub-0000000000000000'
    blocos: {
      artigo: '', // id do bloco exibido no meio dos artigos
      citacao: '', // id do bloco das páginas de citação
      inicio: '', // id do bloco da página inicial
    },
  },

  // Links de afiliado da Amazon na seção "Obras e leituras" de cada artigo.
  // Sem "tag", os links continuam funcionando, mas sem comissão.
  afiliados: {
    pt: { loja: 'https://www.amazon.com.br/s', tag: '' },
    en: { loja: 'https://www.amazon.com/s', tag: '' },
    es: { loja: 'https://www.amazon.com/s', tag: '' },
  },

  // Formulário de newsletter ("um pensamento por dia"). Cole o endereço de
  // inscrição do serviço escolhido, ex.: Buttondown:
  // 'https://buttondown.com/api/emails/embed-subscribe/SEU_USUARIO'
  newsletter: {
    acao: '',
    campo: 'email',
  },

  // Link para doações/assinatura de apoiadores (Ko-fi, Patreon, Apoia.se...).
  apoio: '',
};
