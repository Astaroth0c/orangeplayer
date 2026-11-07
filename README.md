# 🍊 ORANGE Player

**Multiplatform Entertainment System** — Player de mídia IPTV com identidade **Orange Glass UI** e navegação inspirada no **Aurora Dashboard** do Xbox 360.

![ORANGE Player](https://img.shields.io/badge/ORANGE-Player-FF781F?style=for-the-badge&labelColor=101419)

---

## ✨ Destaques

- **Orange Glass UI** — fundo grafite, laranja vibrante, glassmorphism, bordas iluminadas
- **Aurora Dashboard** — carrosséis horizontais, hero card dinâmico, background cinematográfico que muda conforme o foco
- **TV-first** — navegação completa por controle remoto (D-pad), teclado, mouse e toque
- **Multi-fonte** — suporte a Xtream Codes, M3U/M3U8 e catálogo Demo integrado
- **Catálogo completo** — Filmes, Séries (temporadas + episódios), Canais ao vivo com EPG
- **Player profissional** — HLS.js, controles completos, legendas, áudio, velocidade, retomada
- **Experiência pessoal** — perfis, favoritos, histórico, "continuar assistindo", controle parental
- **Banco local** — SQLite via Prisma, com migrações e dados pessoais separados do catálogo importado
- **Responsivo** — funciona em TV, desktop, tablet e mobile

---

## 🚀 Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 |
| Estilo | Tailwind CSS 4 + shadcn/ui |
| Estado | Zustand (cliente) + TanStack Query (servidor) |
| Banco | Prisma ORM + SQLite |
| Player | HTML5 Video + HLS.js |
| Animação | Framer Motion |
| Ícones | Lucide |

---

## 📦 Estrutura

```
src/
├── app/
│   ├── page.tsx              # Orquestrador (boot flow + view router)
│   ├── layout.tsx           # Layout raiz + providers
│   ├── globals.css          # Orange Glass design system
│   └── api/                 # API routes (REST)
│       ├── seed/            # Inicializa catálogo demo
│       ├── profiles/        # Perfis CRUD
│       ├── providers/       # Fontes IPTV (Xtream/M3U/Demo)
│       │   └── [id]/sync/   # Sincroniza catálogo
│       ├── catalog/[type]   # Movies / Series / Live / Categories
│       ├── item/[type]/[id] # Resolve PlayerItem
│       ├── favorites/       # Favoritos CRUD
│       ├── history/         # Histórico + progresso + continue
│       ├── search/          # Busca global + histórico
│       ├── settings/        # Configurações
│       └── epg/[channelId]  # EPG por canal
├── components/
│   ├── orange/              # Componentes ORANGE Player
│   │   ├── splash.tsx
│   │   ├── onboarding/      # Welcome + Xtream/M3U forms + Profile select
│   │   ├── home/            # Aurora Dashboard + Sidebar
│   │   ├── movies/          # Grid + Detail
│   │   ├── series/          # Grid + Detail + Episodes
│   │   ├── live/            # Channels + EPG
│   │   ├── search/          # Busca global
│   │   ├── favorites/       # Favoritos
│   │   ├── history/         # Histórico + Continue
│   │   ├── settings/        # 8 abas de configurações
│   │   ├── profiles/        # Gerenciar perfis
│   │   ├── providers/       # Gerenciar fontes
│   │   └── player/          # Player overlay + Video + Controls
│   └── ui/                  # shadcn/ui
├── stores/                  # Zustand (app + player)
├── hooks/                   # use-spatial-nav (D-pad)
├── lib/                     # db, utils, images, m3u-parser, xtream
├── types/                   # Tipos compartilhados
└── data/                    # Catálogo demo
```

---

## 🎮 Como usar

### Desenvolvimento
```bash
bun install
bun run db:push      # Cria o banco SQLite
bun run dev           # Inicia em http://localhost:3000
```

### Primeiro uso
1. **Splash** → animação de inicialização
2. **Seleção de perfil** → escolha o perfil padrão (ou crie um novo)
3. **Aurora Dashboard** → navegue pelos carrosséis
4. **Adicionar fonte** → em `Fontes`, adicione Xtream Codes, M3U/M3U8 ou use o Demo

### Navegação
- **Mouse/Touch** — clique normal
- **Teclado** — Setas movem o foco, Enter confirma, Esc volta
- **Player** — Espaço (play/pause), Setas (seek/volume), M (mute), F (fullscreen), Esc (sair)

---

## 🎨 Design Tokens

| Token | Valor |
|---|---|
| `--brand` | `#FF781F` |
| `--brand-light` | `#FF963F` |
| `--graphite` | `#101419` |
| `--surface` | `#1B222A` |
| `--glass` | `rgba(24, 30, 38, 0.55)` |
| `--glass-border` | `rgba(255, 255, 255, 0.10)` |
| `--text` | `#F4F6F8` |
| `--muted` | `#AEB7C2` |

Classes utilitárias: `glass`, `glass-card`, `glass-nav`, `brand-glow`, `text-brand-gradient`, `bg-radial-brand`, `bg-hero-overlay`, `card-lift`.

---

## 🔌 Fontes suportadas

### Xtream Codes
- URL do servidor, usuário e senha
- Sincroniza categorias, canais, filmes e séries
- Teste de conexão antes de salvar

### M3U / M3U8
- URL da playlist
- Parser tolerante a malformações
- Classificação automática (live/movie/series) via heurística
- Detecção de séries por padrão `S##E##`

### Demo
- Catálogo integrado com streams públicos legais
- Filmes open-source (Blender Foundation via HLS)
- Canais com EPG simulado
- Pronto para uso sem configuração

---

## 🛡️ Segurança & Privacidade

- Credenciais armazenadas apenas localmente (SQLite)
- URLs com credenciais nunca registradas em logs
- HTTPS preferido para todas as conexões
- Validação de URLs e esquemas permitidos
- PIN e controle parental opcionais
- Limpar histórico/cache/favoritos a qualquer momento

---

## 📝 Notas

Este projeto é uma implementação de referência do ORANGE Player como aplicação web (Next.js). A especificação mestre prevê versões nativas para Android (Kotlin + Media3), Windows/Linux (Tauri/Electron), Samsung Tizen e LG webOS — cada uma com seu motor de reprodução específico. A versão web serve como núcleo compartilhado de interface e regras de negócio.

O catálogo Demo usa exclusivamente streams públicos e legais (HLS test streams da Apple/Mux/Akamai e amostras samplelib.com). O usuário deve adicionar apenas fontes IPTV às quais tenha autorização de acesso.
