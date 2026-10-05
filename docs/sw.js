/* Pensapédia — service worker gerado por src/construir.mjs. */
const VERSAO = 'pensapedia-8095d6e556';
const ESSENCIAIS = ["offline.html","assets/css/estilo.css?v=05b563bc","assets/js/site.js?v=79e70f8d","assets/fontes/source-sans-3-latin-wght-normal.woff2","assets/fontes/eb-garamond-latin-wght-normal.woff2","assets/fontes/eb-garamond-latin-wght-italic.woff2","assets/img/favicon.svg"];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO && n !== 'pensapedia-paginas').map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if (pedido.method !== 'GET' || url.origin !== self.location.origin) return;

  // Páginas: tenta a rede primeiro; sem conexão, usa a cópia guardada.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone();
            caches.open('pensapedia-paginas').then((cache) => cache.put(pedido, copia));
          }
          return resposta;
        })
        .catch(() => caches.match(pedido).then((guardada) => guardada || caches.match('offline.html'))),
    );
    return;
  }

  // Arquivos do site: responde com a cópia guardada e atualiza em segundo plano.
  evento.respondWith(
    caches.open(VERSAO).then((cache) => cache.match(pedido).then((guardada) => {
      const daRede = fetch(pedido).then((resposta) => {
        if (resposta.ok) cache.put(pedido, resposta.clone());
        return resposta;
      }).catch(() => guardada);
      return guardada || daRede;
    })),
  );
});
