// ===========================================================
// DEMO — Catálogo de demonstração do ORANGE Player
// ===========================================================
// Usa streams públicos e legais VERIFICADOS:
//  - Archive.org (filmes open-source Blender Foundation)
//  - test-videos.co.uk (clips de teste curtos)
//  - samplelib.com (amostras curtas)
//  - HLS test streams públicos (Apple, Mux, Akamai) para canais ao vivo
//  - Imagens determinísticas via picsum.photos
//
// Este catálogo é apenas para demonstração. O usuário pode
// adicionar suas próprias fontes Xtream/M3U autorizadas.
// ===========================================================

import type {
  CatalogMovie,
  CatalogSeries,
  CatalogChannel,
  EpgProgram,
} from "@/types";

// Streams verificados no navegador (HLS via hls.js + MP4 samplelib)
// Nota: muitos hosts MP4 bloqueiam CORS no <video>. HLS e samplelib funcionam.
const V = {
  // HLS — conteúdo real, ~10min cada
  bbbHls: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",      // Big Buck Bunny (HLS)
  appleHls: "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
  mux2: "https://stream.mux.com/A3VXy02VoUinw01pwyomEO3bHnG4P32xzV7u1j1FSzjNg.m3u8",
  akamai: "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
  // MP4 curtos (samplelib — CORS-friendly)
  s5: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
  s10: "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
  s15: "https://samplelib.com/lib/preview/mp4/sample-15s.mp4",
  s20: "https://samplelib.com/lib/preview/mp4/sample-20s.mp4",
  s30: "https://samplelib.com/lib/preview/mp4/sample-30s.mp4",
};

// Atalhos para os filmes principais (HLS = conteúdo longo real)
const VBBB = V.bbbHls;        // Big Buck Bunny
const VAPPLE = V.appleHls;    // BipBop Apple
const VMUX = V.mux2;          // Mux
const VAKAMAI = V.akamai;     // Akamai live

// HLS test streams — públicos e verificados
const H = {
  appleAdvanced: "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
  appleBasic: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8",
  mux2: "https://stream.mux.com/A3VXy02VoUinw01pwyomEO3bHnG4P32xzV7u1j1FSzjNg.m3u8",
  muxTestPattern: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  akamai: "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
};

// Helpers
function now(offsetMin: number): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMin);
  return d;
}

function epg(title: string, startOffsetMin: number, durationMin: number, category = "Programa"): EpgProgram {
  const start = now(startOffsetMin);
  const end = now(startOffsetMin + durationMin);
  const total = end.getTime() - start.getTime();
  const elapsed = Date.now() - start.getTime();
  const progress = Math.max(0, Math.min(1, elapsed / total));
  return {
    id: `${title}-${startOffsetMin}`,
    title,
    description: `Programação de ${title}. Conteúdo de demonstração do ORANGE Player.`,
    start: start.toISOString(),
    end: end.toISOString(),
    category,
    progress,
  };
}

// ===========================================================
// FILMES
// ===========================================================

export const DEMO_MOVIES: CatalogMovie[] = [
  {
    id: "demo-m-1", providerId: "demo", streamId: "m1",
    name: "Big Buck Bunny", title: "Big Buck Bunny",
    year: 2008, rating: 7.4, genre: "Animação, Comédia",
    duration: 596,
    poster: "https://picsum.photos/seed/bigbuckbunny/400/600",
    backdrop: "https://picsum.photos/seed/bigbuckbunny-bd/1280/720",
    plot: "Big Buck Bunny é um curta-metragem de animação open-source produzido pela Blender Foundation. A história segue um coelho grande e gentil que se vinga de três roedores que mataram suas amigas voadoras.",
    cast: "Blender Foundation", director: "Sacha Goedegebure",
    streamUrl: VBBB, categoryId: "cat-anim", categoryName: "Animação",
  },
  {
    id: "demo-m-2", providerId: "demo", streamId: "m2",
    name: "Sintel", title: "Sintel",
    year: 2010, rating: 7.1, genre: "Animação, Fantasia, Aventura",
    duration: 888,
    poster: "https://picsum.photos/seed/sintel/400/600",
    backdrop: "https://picsum.photos/seed/sintel-bd/1280/720",
    plot: "Sintel é uma jovem guerreira que embarca em uma jornada perigosa para encontrar seu dragão, escalas, que foi capturado. Um conto emocional sobre amizade e perda.",
    cast: "Blender Foundation", director: "Colin Levy",
    streamUrl: VMUX, categoryId: "cat-anim", categoryName: "Animação",
  },
  {
    id: "demo-m-3", providerId: "demo", streamId: "m3",
    name: "Tears of Steel", title: "Tears of Steel",
    year: 2012, rating: 7.0, genre: "Ficção Científica, Ação",
    duration: 734,
    poster: "https://picsum.photos/seed/tearsofsteel/400/600",
    backdrop: "https://picsum.photos/seed/tearsofsteel-bd/1280/720",
    plot: "Em uma Amsterdam futurista, um grupo de guerreiros e cientistas se reúne para combater um exército de robôs. Um filme live-action open-source da Blender Foundation.",
    cast: "Sergio Hasselbaink, Rogier Schippers, Vanja Rasmusse", director: "Ian Hubert",
    streamUrl: VAPPLE, categoryId: "cat-scfi", categoryName: "Ficção Científica",
  },
  {
    id: "demo-m-4", providerId: "demo", streamId: "m4",
    name: "Elephants Dream", title: "Elephants Dream",
    year: 2006, rating: 6.8, genre: "Animação, Drama, Mistério",
    duration: 654,
    poster: "https://picsum.photos/seed/elephantsdream/400/600",
    backdrop: "https://picsum.photos/seed/elephantsdream-bd/1280/720",
    plot: "Dois personagens, Emo e Proog, exploram um mundo surreal de máquinas estranhas. O primeiro projeto open-source da Blender Foundation.",
    cast: "Blender Foundation", director: "Bassam Kurdali",
    streamUrl: VBBB, categoryId: "cat-anim", categoryName: "Animação",
  },
  {
    id: "demo-m-5", providerId: "demo", streamId: "m5",
    name: "Caminandes: Llama Drama", title: "Caminandes: Llama Drama",
    year: 2013, rating: 6.5, genre: "Animação, Comédia",
    duration: 240,
    poster: "https://picsum.photos/seed/caminandes/400/600",
    backdrop: "https://picsum.photos/seed/caminandes-bd/1280/720",
    plot: "Uma lhama engraçada tenta atravistar uma estrada na Patagônia. Curta-metragem de animação open-source da Blender Foundation.",
    cast: "Blender Foundation", director: " Pablo Vázquez",
    streamUrl: V.s20, categoryId: "cat-anim", categoryName: "Animação",
  },
  {
    id: "demo-m-6", providerId: "demo", streamId: "m6",
    name: "Avenida Brasil", title: "Avenida Brasil",
    year: 2019, rating: 6.5, genre: "Drama",
    duration: 360,
    poster: "https://picsum.photos/seed/avbrasil/400/600",
    backdrop: "https://picsum.photos/seed/avbrasil-bd/1280/720",
    plot: "Um drama urbano que explora as contradições da vida nas grandes cidades brasileiras, onde sonhos e desafios se cruzam diariamente.",
    cast: "Elenco Variado", director: "Vários Diretores",
    streamUrl: V.s15, categoryId: "cat-drama", categoryName: "Drama",
  },
  {
    id: "demo-m-7", providerId: "demo", streamId: "m7",
    name: "Tempestade Tropical", title: "Tempestade Tropical",
    year: 2021, rating: 6.9, genre: "Ação, Aventura",
    duration: 420,
    poster: "https://picsum.photos/seed/tempestade/400/600",
    backdrop: "https://picsum.photos/seed/tempestade-bd/1280/720",
    plot: "Uma equipe de resgate enfrenta uma tempestade devastadora enquanto tenta salvar uma cidade costeira isolada pelo furacão.",
    cast: "Elenco Variado", director: "Vários Diretores",
    streamUrl: V.s30, categoryId: "cat-action", categoryName: "Ação",
  },
  {
    id: "demo-m-8", providerId: "demo", streamId: "m8",
    name: "Operação Meia-Noite", title: "Operação Meia-Noite",
    year: 2020, rating: 7.2, genre: "Suspense, Ação",
    duration: 480,
    poster: "https://picsum.photos/seed/operacao/400/600",
    backdrop: "https://picsum.photos/seed/operacao-bd/1280/720",
    plot: "Um agente secreto precisa impedir um ataque cibernético global em apenas 12 horas. Um suspense repleto de reviravoltas.",
    cast: "Elenco Variado", director: "Vários Diretores",
    streamUrl: VMUX, categoryId: "cat-suspense", categoryName: "Suspense",
  },
  {
    id: "demo-m-9", providerId: "demo", streamId: "m9",
    name: "Coração de Aço", title: "Coração de Aço",
    year: 2018, rating: 6.7, genre: "Drama, Esporte",
    duration: 390,
    poster: "https://picsum.photos/seed/coracao/400/600",
    backdrop: "https://picsum.photos/seed/coracao-bd/1280/720",
    plot: "Um lutador aposentado encontra uma última chance de glória treinando um jovem promissor vindo das periferias.",
    cast: "Elenco Variado", director: "Vários Diretores",
    streamUrl: V.s30, categoryId: "cat-drama", categoryName: "Drama",
  },
  {
    id: "demo-m-10", providerId: "demo", streamId: "m10",
    name: "Coração Selvagem", title: "Coração Selvagem",
    year: 2017, rating: 6.4, genre: "Aventura, Romance",
    duration: 410,
    poster: "https://picsum.photos/seed/selvagem/400/600",
    backdrop: "https://picsum.photos/seed/selvagem-bd/1280/720",
    plot: "Uma bióloga se apaixona por um pesquisador enquanto estudam a vida selvagem na Amazônia.",
    cast: "Elenco Variado", director: "Vários Diretores",
    streamUrl: V.s10, categoryId: "cat-adv", categoryName: "Aventura",
  },
  {
    id: "demo-m-11", providerId: "demo", streamId: "m11",
    name: "Cidades Perdidas", title: "Cidades Perdidas",
    year: 2022, rating: 7.3, genre: "Documentário, Aventura",
    duration: 520,
    poster: "https://picsum.photos/seed/cidades/400/600",
    backdrop: "https://picsum.photos/seed/cidades-bd/1280/720",
    plot: "Uma expedição arqueológica busca vestígios de civilizações esquecidas nas profundezas da floresta amazônica.",
    cast: "Elenco Variado", director: "Vários Diretores",
    streamUrl: V.s10, categoryId: "cat-doc", categoryName: "Documentário",
  },
  {
    id: "demo-m-12", providerId: "demo", streamId: "m12",
    name: "Velocidade Máxima", title: "Velocidade Máxima",
    year: 2020, rating: 6.8, genre: "Ação, Esporte",
    duration: 460,
    poster: "https://picsum.photos/seed/velocidade/400/600",
    backdrop: "https://picsum.photos/seed/velocidade-bd/1280/720",
    plot: "Pilotos profissionais disputam a corrida mais perigosa do mundo em uma jornada cheia de adrenalina.",
    cast: "Elenco Variado", director: "Vários Diretores",
    streamUrl: VAPPLE, categoryId: "cat-action", categoryName: "Ação",
  },
  {
    id: "demo-m-13", providerId: "demo", streamId: "m13",
    name: "A Última Fronteira", title: "A Última Fronteira",
    year: 2019, rating: 7.0, genre: "Faroeste, Aventura",
    duration: 540,
    poster: "https://picsum.photos/seed/fronteira/400/600",
    backdrop: "https://picsum.photos/seed/fronteira-bd/1280/720",
    plot: "No velho oeste, um xeriffe solitário enfrenta um bando de foragidos para proteger uma pequena cidade.",
    cast: "Elenco Variado", director: "Vários Diretores",
    streamUrl: V.s5, categoryId: "cat-adv", categoryName: "Aventura",
  },
  {
    id: "demo-m-14", providerId: "demo", streamId: "m14",
    name: "Código Vermelho", title: "Código Vermelho",
    year: 2021, rating: 7.5, genre: "Suspense, Ficção Científica",
    duration: 600,
    poster: "https://picsum.photos/seed/codigo/400/600",
    backdrop: "https://picsum.photos/seed/codigo-bd/1280/720",
    plot: "Um hacker descobre uma conspiração global enquanto investiga um ataque a uma central de dados.",
    cast: "Elenco Variado", director: "Vários Diretores",
    streamUrl: VAPPLE, categoryId: "cat-scfi", categoryName: "Ficção Científica",
  },
  {
    id: "demo-m-15", providerId: "demo", streamId: "m15",
    name: "Luzes da Cidade", title: "Luzes da Cidade",
    year: 2018, rating: 6.9, genre: "Romance, Drama",
    duration: 420,
    poster: "https://picsum.photos/seed/luzes/400/600",
    backdrop: "https://picsum.photos/seed/luzes-bd/1280/720",
    plot: "Dois estranhos se encontram em uma metrópole e descobrem que têm mais em comum do que imaginavam.",
    cast: "Elenco Variado", director: "Vários Diretores",
    streamUrl: V.s20, categoryId: "cat-romance", categoryName: "Romance",
  },
  {
    id: "demo-m-16", providerId: "demo", streamId: "m16",
    name: "Profundezas do Oceano", title: "Profundezas do Oceano",
    year: 2020, rating: 7.1, genre: "Documentário, Natureza",
    duration: 540,
    poster: "https://picsum.photos/seed/oceano/400/600",
    backdrop: "https://picsum.photos/seed/oceano-bd/1280/720",
    plot: "Mergulhe nas profundezas dos oceanos e descubra criaturas fascinantes em seus habitats naturais.",
    cast: "Narrador", director: "Vários Diretores",
    streamUrl: VBBB, categoryId: "cat-doc", categoryName: "Documentário",
  },
];

// ===========================================================
// SÉRIES
// ===========================================================

export const DEMO_SERIES: CatalogSeries[] = [
  {
    id: "demo-s-1", providerId: "demo", seriesId: "s1",
    name: "Crônicas da Galáxia", title: "Crônicas da Galáxia",
    year: 2019, rating: 8.2, genre: "Ficção Científica, Aventura",
    poster: "https://picsum.photos/seed/galaxia/400/600",
    backdrop: "https://picsum.photos/seed/galaxia-bd/1280/720",
    plot: "A tripulação da nave Orion explora os confins da galáxia, descobrindo novas civilizações e enfrentando perigos inimagináveis.",
    cast: "Elenco Variado", categoryId: "cat-scfi", categoryName: "Ficção Científica",
    seasons: [
      {
        id: "demo-s-1-t1", seasonNumber: 1, name: "Temporada 1",
        overview: "A tripulação parte em sua primeira missão interestelar.",
        episodes: [
          { id: "demo-s-1-t1-e1", episodeNum: 1, title: "O Despertar", overview: "A nave Orion parte em sua primeira missão.", duration: 596, streamUrl: VBBB, poster: "https://picsum.photos/seed/galaxia-t1e1/400/600", airDate: "2019-01-10" },
          { id: "demo-s-1-t1-e2", episodeNum: 2, title: "Sinais no Vazio", overview: "Mistérios surgem em uma estação abandonada.", duration: 888, streamUrl: VMUX, poster: "https://picsum.photos/seed/galaxia-t1e2/400/600", airDate: "2019-01-17" },
          { id: "demo-s-1-t1-e3", episodeNum: 3, title: "Aliados Inesperados", overview: "Um novo aliado se junta à tripulação.", duration: 734, streamUrl: VAPPLE, poster: "https://picsum.photos/seed/galaxia-t1e3/400/600", airDate: "2019-01-24" },
          { id: "demo-s-1-t1-e4", episodeNum: 4, title: "A Tempestade", overview: "A nave enfrenta uma tempestade cósmica.", duration: 654, streamUrl: VBBB, poster: "https://picsum.photos/seed/galaxia-t1e4/400/600", airDate: "2019-01-31" },
          { id: "demo-s-1-t1-e5", episodeNum: 5, title: "Ponto de Retorno", overview: "Decisões difíceis devem ser tomadas.", duration: 480, streamUrl: VMUX, poster: "https://picsum.photos/seed/galaxia-t1e5/400/600", airDate: "2019-02-07" },
        ],
      },
      {
        id: "demo-s-1-t2", seasonNumber: 2, name: "Temporada 2",
        overview: "Novas missões aguardam a tripulação da Orion.",
        episodes: [
          { id: "demo-s-1-t2-e1", episodeNum: 1, title: "O Novo Mundo", overview: "Uma nova fronteira é descoberta.", duration: 420, streamUrl: V.s15, poster: "https://picsum.photos/seed/galaxia-t2e1/400/600", airDate: "2020-01-09" },
          { id: "demo-s-1-t2-e2", episodeNum: 2, title: "O Comboio", overview: "A tripulação ajuda um comboio sob ataque.", duration: 360, streamUrl: V.s20, poster: "https://picsum.photos/seed/galaxia-t2e2/400/600", airDate: "2020-01-16" },
          { id: "demo-s-1-t2-e3", episodeNum: 3, title: "O Preço da Liberdade", overview: "Sacrifícios são feitos pela tripulação.", duration: 540, streamUrl: V.s30, poster: "https://picsum.photos/seed/galaxia-t2e3/400/600", airDate: "2020-01-23" },
          { id: "demo-s-1-t2-e4", episodeNum: 4, title: "Confronto Final", overview: "A batalha decisiva acontece.", duration: 600, streamUrl: VAPPLE, poster: "https://picsum.photos/seed/galaxia-t2e4/400/600", airDate: "2020-01-30" },
        ],
      },
    ],
  },
  {
    id: "demo-s-2", providerId: "demo", seriesId: "s2",
    name: "Detetive Ferreira", title: "Detetive Ferreira",
    year: 2020, rating: 8.5, genre: "Suspense, Policial, Drama",
    poster: "https://picsum.photos/seed/ferreira/400/600",
    backdrop: "https://picsum.photos/seed/ferreira-bd/1280/720",
    plot: "Um detetive veterano da polícia resolve casos impossíveis nas ruas de uma metrópole sul-americana.",
    cast: "Elenco Variado", categoryId: "cat-suspense", categoryName: "Suspense",
    seasons: [
      {
        id: "demo-s-2-t1", seasonNumber: 1, name: "Temporada 1",
        episodes: [
          { id: "demo-s-2-t1-e1", episodeNum: 1, title: "O Caso do Beco", overview: "Um corpo é encontrado em um beco.", duration: 420, streamUrl: V.s10, poster: "https://picsum.photos/seed/ferreira-t1e1/400/600", airDate: "2020-03-15" },
          { id: "demo-s-2-t1-e2", episodeNum: 2, title: "Mentiras", overview: "Testemunhas escondem segredos.", duration: 480, streamUrl: VMUX, poster: "https://picsum.photos/seed/ferreira-t1e2/400/600", airDate: "2020-03-22" },
          { id: "demo-s-2-t1-e3", episodeNum: 3, title: "A Confissão", overview: "Um suspeito confessa — mas será verdade?", duration: 540, streamUrl: V.s15, poster: "https://picsum.photos/seed/ferreira-t1e3/400/600", airDate: "2020-03-29" },
          { id: "demo-s-2-t1-e4", episodeNum: 4, title: "Verdade Revelada", overview: "O caso se encerra com uma reviravolta.", duration: 460, streamUrl: VAPPLE, poster: "https://picsum.photos/seed/ferreira-t1e4/400/600", airDate: "2020-04-05" },
        ],
      },
    ],
  },
  {
    id: "demo-s-3", providerId: "demo", seriesId: "s3",
    name: "Cozinha Real", title: "Cozinha Real",
    year: 2021, rating: 7.4, genre: "Reality, Culinária",
    poster: "https://picsum.photos/seed/cozinha/400/600",
    backdrop: "https://picsum.photos/seed/cozinha-bd/1280/720",
    plot: "Chefs amadores competem em desafios culinários emocionantes para se tornar o melhor do país.",
    cast: "Apresentador Variado", categoryId: "cat-reality", categoryName: "Reality",
    seasons: [
      {
        id: "demo-s-3-t1", seasonNumber: 1, name: "Temporada 1",
        episodes: [
          { id: "demo-s-3-t1-e1", episodeNum: 1, title: "Auditorias", overview: "Milhares tentam a sorte.", duration: 360, streamUrl: V.s20, poster: "https://picsum.photos/seed/cozinha-t1e1/400/600", airDate: "2021-05-02" },
          { id: "demo-s-3-t1-e2", episodeNum: 2, title: "Caixa Misteriosa", overview: "Ingredientes surpresa desafiam os competidores.", duration: 420, streamUrl: V.s30, poster: "https://picsum.photos/seed/cozinha-t1e2/400/600", airDate: "2021-05-09" },
          { id: "demo-s-3-t1-e3", episodeNum: 3, title: "Pressão em Dupla", overview: "Competidores enfrentam desafios em duplas.", duration: 390, streamUrl: V.s10, poster: "https://picsum.photos/seed/cozinha-t1e3/400/600", airDate: "2021-05-16" },
        ],
      },
    ],
  },
  {
    id: "demo-s-4", providerId: "demo", seriesId: "s4",
    name: "Reinos em Guerra", title: "Reinos em Guerra",
    year: 2018, rating: 8.7, genre: "Fantasia, Drama, Aventura",
    poster: "https://picsum.photos/seed/reinos/400/600",
    backdrop: "https://picsum.photos/seed/reinos-bd/1280/720",
    plot: "Em um continente dividido por reinos rivais, alianças são forjadas e quebradas enquanto reis disputam o trono.",
    cast: "Elenco Variado", categoryId: "cat-fantasy", categoryName: "Fantasia",
    seasons: [
      {
        id: "demo-s-4-t1", seasonNumber: 1, name: "Temporada 1",
        episodes: [
          { id: "demo-s-4-t1-e1", episodeNum: 1, title: "A Coroa Partida", overview: "O rei morre sem herdeiro claro.", duration: 600, streamUrl: VAPPLE, poster: "https://picsum.photos/seed/reinos-t1e1/400/600", airDate: "2018-04-06" },
          { id: "demo-s-4-t1-e2", episodeNum: 2, title: "Os Leões do Norte", overview: "Uma casa nobre se mobiliza.", duration: 540, streamUrl: VMUX, poster: "https://picsum.photos/seed/reinos-t1e2/400/600", airDate: "2018-04-13" },
          { id: "demo-s-4-t1-e3", episodeNum: 3, title: "Espadas e Juramentos", overview: "Alianças se formam no campo de batalha.", duration: 580, streamUrl: VBBB, poster: "https://picsum.photos/seed/reinos-t1e3/400/600", airDate: "2018-04-20" },
          { id: "demo-s-4-t1-e4", episodeNum: 4, title: "A Batalha do Vale", overview: "Um confronto decisivo muda tudo.", duration: 620, streamUrl: VBBB, poster: "https://picsum.photos/seed/reinos-t1e4/400/600", airDate: "2018-04-27" },
        ],
      },
      {
        id: "demo-s-4-t2", seasonNumber: 2, name: "Temporada 2",
        episodes: [
          { id: "demo-s-4-t2-e1", episodeNum: 1, title: "Inverno Chega", overview: "As consequências da guerra chegam.", duration: 660, streamUrl: VMUX, poster: "https://picsum.photos/seed/reinos-t2e1/400/600", airDate: "2019-04-05" },
          { id: "demo-s-4-t2-e2", episodeNum: 2, title: "Dragões Despertos", overview: "Um poder antigo desperta.", duration: 700, streamUrl: V.s15, poster: "https://picsum.photos/seed/reinos-t2e2/400/600", airDate: "2019-04-12" },
          { id: "demo-s-4-t2-e3", episodeNum: 3, title: "A Queda", overview: "Um reino cai perante o inimigo.", duration: 640, streamUrl: V.s30, poster: "https://picsum.photos/seed/reinos-t2e3/400/600", airDate: "2019-04-19" },
        ],
      },
    ],
  },
  {
    id: "demo-s-5", providerId: "demo", seriesId: "s5",
    name: "Vidas Cruzadas", title: "Vidas Cruzadas",
    year: 2019, rating: 7.8, genre: "Drama, Romance",
    poster: "https://picsum.photos/seed/vidas/400/600",
    backdrop: "https://picsum.photos/seed/vidas-bd/1280/720",
    plot: "Cinco famílias de um bairro popular têm suas vidas entrelaçadas por amor, tragédia e segredos.",
    cast: "Elenco Variado", categoryId: "cat-drama", categoryName: "Drama",
    seasons: [
      {
        id: "demo-s-5-t1", seasonNumber: 1, name: "Temporada 1",
        episodes: [
          { id: "demo-s-5-t1-e1", episodeNum: 1, title: "Novos Vizinhos", overview: "Uma nova família chega ao bairro.", duration: 280, streamUrl: V.s20, poster: "https://picsum.photos/seed/vidas-t1e1/400/600", airDate: "2019-08-04" },
          { id: "demo-s-5-t1-e2", episodeNum: 2, title: "Encontros", overview: "Relações começam a se formar.", duration: 300, streamUrl: V.s10, poster: "https://picsum.photos/seed/vidas-t1e2/400/600", airDate: "2019-08-11" },
          { id: "demo-s-5-t1-e3", episodeNum: 3, title: "Segredos", overview: "Segredos antigos ameaçam vir à tona.", duration: 320, streamUrl: V.s30, poster: "https://picsum.photos/seed/vidas-t1e3/400/600", airDate: "2019-08-18" },
        ],
      },
    ],
  },
];

// ===========================================================
// CANAIS AO VIVO
// ===========================================================

export const DEMO_CHANNELS: CatalogChannel[] = [
  {
    id: "demo-c-1", providerId: "demo", channelId: "c1",
    name: "ORANGE Notícias", num: 1,
    logo: "https://picsum.photos/seed/orangenews-logo/128/128",
    streamUrl: H.appleAdvanced, epgId: "news-1",
    categoryId: "cat-news", categoryName: "Notícias",
    nowPlaying: epg("Jornal da Manhã", -120, 180, "Jornalismo"),
    nextPlaying: epg("Boletim ao Vivo", 60, 60, "Jornalismo"),
  },
  {
    id: "demo-c-2", providerId: "demo", channelId: "c2",
    name: "ORANGE Esportes", num: 2,
    logo: "https://picsum.photos/seed/orangesports-logo/128/128",
    streamUrl: H.mux2, epgId: "sports-1",
    categoryId: "cat-sports", categoryName: "Esportes",
    nowPlaying: epg("Jogo ao Vivo: Clássico Regional", -45, 105, "Futebol"),
    nextPlaying: epg("Resumo da Rodada", 60, 60, "Esportes"),
  },
  {
    id: "demo-c-3", providerId: "demo", channelId: "c3",
    name: "ORANGE Cinema", num: 3,
    logo: "https://picsum.photos/seed/orangecinema-logo/128/128",
    streamUrl: H.mux2, epgId: "cinema-1",
    categoryId: "cat-movies", categoryName: "Filmes",
    nowPlaying: epg("Clássicos do Cinema", -90, 150, "Filme"),
    nextPlaying: epg("Sessão Premiada", 60, 120, "Filme"),
  },
  {
    id: "demo-c-4", providerId: "demo", channelId: "c4",
    name: "ORANGE Kids", num: 4,
    logo: "https://picsum.photos/seed/orangekids-logo/128/128",
    streamUrl: H.appleBasic, epgId: "kids-1",
    categoryId: "cat-kids", categoryName: "Infantil",
    nowPlaying: epg("Desenho: Aventuras Mágicas", -30, 60, "Infantil"),
    nextPlaying: epg("Programa Infantil", 30, 60, "Infantil"),
  },
  {
    id: "demo-c-5", providerId: "demo", channelId: "c5",
    name: "ORANGE Documentários", num: 5,
    logo: "https://picsum.photos/seed/orangedocs-logo/128/128",
    streamUrl: H.muxTestPattern, epgId: "docs-1",
    categoryId: "cat-doc", categoryName: "Documentários",
    nowPlaying: epg("Planeta Azul", -60, 90, "Documentário"),
    nextPlaying: epg("Civilizações Antigas", 30, 90, "Documentário"),
  },
  {
    id: "demo-c-6", providerId: "demo", channelId: "c6",
    name: "ORANGE Music", num: 6,
    logo: "https://picsum.photos/seed/orangemusic-logo/128/128",
    streamUrl: H.akamai, epgId: "music-1",
    categoryId: "cat-music", categoryName: "Música",
    nowPlaying: epg("Top Hits ao Vivo", -75, 120, "Música"),
    nextPlaying: epg("Clássicos dos Anos 80", 45, 120, "Música"),
  },
  {
    id: "demo-c-7", providerId: "demo", channelId: "c7",
    name: "ORANGE Series", num: 7,
    logo: "https://picsum.photos/seed/orangeseries-logo/128/128",
    streamUrl: H.muxTestPattern, epgId: "series-1",
    categoryId: "cat-series", categoryName: "Séries",
    nowPlaying: epg("Maratona: Crônicas da Galáxia", -40, 100, "Série"),
    nextPlaying: epg("Especial: Bastidores", 60, 60, "Série"),
  },
  {
    id: "demo-c-8", providerId: "demo", channelId: "c8",
    name: "ORANGE Talk", num: 8,
    logo: "https://picsum.photos/seed/orangetalk-logo/128/128",
    streamUrl: H.appleAdvanced, epgId: "talk-1",
    categoryId: "cat-talk", categoryName: "Entrevista",
    nowPlaying: epg("Conversa com Artistas", -50, 80, "Talk Show"),
    nextPlaying: epg("Mesa Redonda", 30, 90, "Talk Show"),
  },
];

// EPG extendido por canal (3-4 programas ao longo do dia)
export const DEMO_EPG: Record<string, EpgProgram[]> = {
  "demo-c-1": [
    epg("Jornal da Manhã", -120, 180, "Jornalismo"),
    epg("Boletim ao Vivo", 60, 60, "Jornalismo"),
    epg("Entrevista do Dia", 120, 90, "Entrevista"),
    epg("Jornal da Noite", 210, 120, "Jornalismo"),
  ],
  "demo-c-2": [
    epg("Jogo ao Vivo: Clássico Regional", -45, 105, "Futebol"),
    epg("Resumo da Rodada", 60, 60, "Esportes"),
    epg("Interview Esportiva", 120, 60, "Entrevista"),
    epg("Race Highlights", 180, 90, "Automobilismo"),
  ],
  "demo-c-3": [
    epg("Clássicos do Cinema", -90, 150, "Filme"),
    epg("Sessão Premiada", 60, 120, "Filme"),
    epg("Cult Movies", 180, 120, "Filme"),
  ],
  "demo-c-4": [
    epg("Desenho: Aventuras Mágicas", -30, 60, "Infantil"),
    epg("Programa Infantil", 30, 60, "Infantil"),
    epg("Desenho: Reino Animal", 90, 60, "Infantil"),
    epg("Hora da Brincadeira", 150, 60, "Infantil"),
  ],
  "demo-c-5": [
    epg("Planeta Azul", -60, 90, "Documentário"),
    epg("Civilizações Antigas", 30, 90, "Documentário"),
    epg("Tecnologia do Futuro", 120, 90, "Documentário"),
  ],
  "demo-c-6": [
    epg("Top Hits ao Vivo", -75, 120, "Música"),
    epg("Clássicos dos Anos 80", 45, 120, "Música"),
    epg("Acústico", 165, 90, "Música"),
  ],
  "demo-c-7": [
    epg("Maratona: Crônicas da Galáxia", -40, 100, "Série"),
    epg("Especial: Bastidores", 60, 60, "Especial"),
    epg("Reinos em Guerra: Episódio Bônus", 120, 90, "Série"),
  ],
  "demo-c-8": [
    epg("Conversa com Artistas", -50, 80, "Talk Show"),
    epg("Mesa Redonda", 30, 90, "Talk Show"),
    epg("Debate Político", 120, 120, "Talk Show"),
  ],
};

export const DEMO_CATEGORIES = {
  movie: [
    { id: "cat-anim", name: "Animação" },
    { id: "cat-action", name: "Ação" },
    { id: "cat-adv", name: "Aventura" },
    { id: "cat-drama", name: "Drama" },
    { id: "cat-scfi", name: "Ficção Científica" },
    { id: "cat-suspense", name: "Suspense" },
    { id: "cat-romance", name: "Romance" },
    { id: "cat-doc", name: "Documentário" },
  ],
  series: [
    { id: "cat-scfi", name: "Ficção Científica" },
    { id: "cat-suspense", name: "Suspense" },
    { id: "cat-reality", name: "Reality" },
    { id: "cat-fantasy", name: "Fantasia" },
    { id: "cat-drama", name: "Drama" },
  ],
  live: [
    { id: "cat-news", name: "Notícias" },
    { id: "cat-sports", name: "Esportes" },
    { id: "cat-movies", name: "Filmes" },
    { id: "cat-kids", name: "Infantil" },
    { id: "cat-doc", name: "Documentários" },
    { id: "cat-music", name: "Música" },
    { id: "cat-series", name: "Séries" },
    { id: "cat-talk", name: "Entrevista" },
  ],
};
