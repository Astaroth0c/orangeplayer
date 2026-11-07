"use client";

// ===========================================================
// AuroraDashboard — Home screen do ORANGE Player
// Inspirado no Xbox 360 Aurora: carrosséis de capas + hero dinâmico
// com backdrop que crossfaz conforme o usuário navega o foco.
// ===========================================================

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Play,
  RotateCcw,
  Info,
  Heart,
  Star,
  Clock,
  Tv,
  ChevronRight,
  Search,
  Film,
  Clapperboard,
  Home as HomeIcon,
} from "lucide-react";

import { useAppStore } from "@/stores/app-store";
import { OrangeButton } from "@/components/orange/orange-button";
import { Poster, BackdropImage } from "@/components/orange/poster";
import { Carousel, CarouselItem } from "@/components/orange/carousel";
import { useGridNavigation } from "@/hooks/use-spatial-nav";
import { cn } from "@/lib/utils";
import { placeholderBackdrop } from "@/lib/images";
import type {
  CatalogMovie,
  CatalogSeries,
  CatalogChannel,
  PlayerItem,
  ScreenView,
  ItemType,
} from "@/types";

// ===========================================================
// Tipos locais
// ===========================================================

type ContinueItem = {
  itemType: ItemType;
  itemId: string;
  title: string;
  poster: string | null;
  backdrop: string | null;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
};

type AuroraFocused =
  | { kind: "movie"; data: CatalogMovie }
  | { kind: "series"; data: CatalogSeries }
  | { kind: "channel"; data: CatalogChannel }
  | { kind: "continue"; data: ContinueItem };

type HeroInfo = {
  title: string;
  subtitle?: string;
  backdrop?: string | null;
  year: number | null;
  genre: string | null;
  rating: number | null;
  duration: number | null;
  plot: string | null;
  categoryName: string | null;
  badges: string[];
};

// ===========================================================
// Helpers
// ===========================================================

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}min ${s.toString().padStart(2, "0")}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

function formatRating(r: number | null | undefined): string {
  if (r == null) return "";
  return r.toFixed(1);
}

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function deriveHeroInfo(f: AuroraFocused | null): HeroInfo | null {
  if (!f) return null;
  if (f.kind === "movie") {
    const m = f.data;
    return {
      title: m.title || m.name,
      backdrop: m.backdrop || placeholderBackdrop(m.title || m.name),
      year: m.year ?? null,
      genre: m.genre ?? null,
      rating: m.rating ?? null,
      duration: m.duration ?? null,
      plot: m.plot ?? null,
      categoryName: m.categoryName ?? null,
      badges: ["Filme"],
    };
  }
  if (f.kind === "series") {
    const s = f.data;
    const seasonsCount = s.seasons?.length ?? 0;
    const epCount = (s.seasons ?? []).reduce(
      (acc, sn) => acc + (sn.episodes?.length ?? 0),
      0,
    );
    return {
      title: s.title || s.name,
      subtitle:
        seasonsCount > 0
          ? `${seasonsCount} temporada${seasonsCount === 1 ? "" : "s"}${epCount ? ` · ${epCount} episódios` : ""}`
          : "Série",
      backdrop: s.backdrop || s.poster || placeholderBackdrop(s.title || s.name),
      year: s.year ?? null,
      genre: s.genre ?? null,
      rating: s.rating ?? null,
      duration: null,
      plot: s.plot ?? null,
      categoryName: s.categoryName ?? null,
      badges: ["Série"],
    };
  }
  if (f.kind === "channel") {
    const c = f.data;
    return {
      title: c.name,
      subtitle: c.nowPlaying?.title
        ? `Ao vivo: ${c.nowPlaying.title}`
        : "Programação contínua",
      // Logo pequeno fica pixelado como cover — preferimos o gradient via BackdropImage
      backdrop: null,
      year: null,
      genre: null,
      rating: null,
      duration: null,
      plot:
        c.nowPlaying?.description ??
        c.nowPlaying?.title ??
        "Sintonize no canal e aproveite a programação ao vivo.",
      categoryName: c.categoryName ?? null,
      badges: c.num ? [`Canal ${c.num}`, "AO VIVO"] : ["AO VIVO"],
    };
  }
  // continue
  const c = f.data;
  const pct = c.duration > 0 ? Math.round((c.position / c.duration) * 100) : 0;
  return {
    title: c.title,
    subtitle: `Continue de ${formatDuration(c.position)} · ${pct}%`,
    backdrop: c.backdrop || c.poster || placeholderBackdrop(c.title),
    year: null,
    genre: null,
    rating: null,
    duration: c.duration ?? null,
    plot: `Você parou em ${formatDuration(c.position)} de ${formatDuration(
      c.duration,
    )}. Toque em Continuar para retomar do ponto onde parou.`,
    categoryName: null,
    badges: ["Continuar"],
  };
}

async function fetchPlayerItem(
  kind: ItemType,
  id: string,
  profileId: string,
): Promise<PlayerItem | null> {
  try {
    const res = await fetch(
      `/api/item/${kind}/${encodeURIComponent(id)}?profileId=${encodeURIComponent(profileId)}`,
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Erro ao carregar item");
    }
    const data = await res.json();
    return data.item as PlayerItem;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Erro ao carregar item");
    return null;
  }
}

// ===========================================================
// Sub-componentes
// ===========================================================

function MetaDot() {
  return <span className="text-muted-foreground/40">•</span>;
}

function StarRating({ value }: { value: number | null }) {
  if (value == null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-amber-400">
      <Star className="w-3.5 h-3.5 fill-amber-400" />
      <span className="font-medium">{formatRating(value)}</span>
    </span>
  );
}

function HeroBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full glass border border-white/10 text-foreground/90">
      {children}
    </span>
  );
}

function MetaRow({ info }: { info: HeroInfo }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      {info.year != null && <span>{info.year}</span>}
      {info.year != null && info.genre && <MetaDot />}
      {info.genre && (
        <span className="truncate max-w-[260px]">{info.genre}</span>
      )}
      {info.rating != null && (
        <>
          <MetaDot />
          <StarRating value={info.rating} />
        </>
      )}
      {info.duration != null && info.duration > 0 && (
        <>
          <MetaDot />
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(info.duration)}
          </span>
        </>
      )}
      {info.categoryName && (
        <>
          <MetaDot />
          <HeroBadge>{info.categoryName}</HeroBadge>
        </>
      )}
    </div>
  );
}

function MobileTopBar() {
  const { profile, pushView } = useAppStore();
  return (
    <header className="md:hidden absolute top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2">
        <svg
          width="28"
          height="28"
          viewBox="0 0 140 140"
          className="drop-shadow-[0_0_8px_rgba(255,120,31,0.5)]"
        >
          <defs>
            <linearGradient id="mb-lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFB45F" />
              <stop offset="0.5" stopColor="#FF781F" />
              <stop offset="1" stopColor="#E85D0F" />
            </linearGradient>
          </defs>
          <path
            d="M70 12 L120 40 L120 100 L70 128 L20 100 L20 40 Z"
            fill="none"
            stroke="url(#mb-lg)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <circle cx="70" cy="70" r="16" fill="url(#mb-lg)" />
        </svg>
        <span className="text-base font-extrabold">
          <span className="text-brand-gradient">ORANGE</span>
          <span className="ml-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Player
          </span>
        </span>
      </div>
      <button
        data-focusable
        onClick={() => pushView("profiles")}
        className="pointer-events-auto w-9 h-9 rounded-full bg-brand/20 border border-brand/40 grid place-items-center text-brand font-bold focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite"
        aria-label="Perfis"
      >
        {profile?.name?.[0]?.toUpperCase() ?? "U"}
      </button>
    </header>
  );
}

function MobileBottomNav() {
  const { view, pushView } = useAppStore();
  const items: { view: ScreenView; label: string; icon: any }[] = [
    { view: "home", label: "Início", icon: HomeIcon },
    { view: "movies", label: "Filmes", icon: Film },
    { view: "series", label: "Séries", icon: Clapperboard },
    { view: "live", label: "TV", icon: Tv },
    { view: "search", label: "Busca", icon: Search },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-white/10 px-2 py-1.5 flex items-center justify-around">
      {items.map((it) => {
        const Icon = it.icon;
        const active = view === it.view;
        return (
          <button
            key={it.view}
            data-focusable
            onClick={() => pushView(it.view)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-all",
              "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
              active ? "text-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={cn("w-5 h-5", active && "scale-110")} />
            <span className="text-[10px] font-medium">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function ContinueCard({
  item,
  onFocus,
  onClick,
}: {
  item: ContinueItem;
  onFocus: () => void;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const pct =
    item.duration > 0
      ? Math.min(100, Math.max(0, (item.position / item.duration) * 100))
      : 0;
  const src = !imgError
    ? item.backdrop || item.poster
    : placeholderBackdrop(item.title);
  return (
    <CarouselItem
      onFocus={onFocus}
      onMouseEnter={onFocus}
      onClick={onClick}
      className="w-[280px] md:w-[300px]"
      aria-label={`Continuar ${item.title}`}
    >
      <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-graphite/60 group">
        <img
          src={src ?? undefined}
          alt={item.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 rounded-full glass-strong border border-brand/40 grid place-items-center text-brand">
            <Play className="w-5 h-5 fill-brand" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 pt-8">
          <div className="text-sm font-semibold truncate">{item.title}</div>
          <div className="text-xs text-muted-foreground">
            {formatDuration(item.position)} de {formatDuration(item.duration)}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white/15">
          <div
            className="h-full bg-brand shadow-[0_0_8px_rgba(255,120,31,0.7)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </CarouselItem>
  );
}

function MovieCard({
  movie,
  onFocus,
  onClick,
}: {
  movie: CatalogMovie;
  onFocus: () => void;
  onClick: () => void;
}) {
  return (
    <CarouselItem
      onFocus={onFocus}
      onMouseEnter={onFocus}
      onClick={onClick}
      className="w-[150px] md:w-[180px]"
      aria-label={movie.title}
    >
      <Poster
        src={movie.poster}
        title={movie.title}
        subtitle={movie.year ? String(movie.year) : undefined}
        aspect="portrait"
        rounded="lg"
      />
      <div className="mt-2 px-0.5">
        <div className="text-sm font-medium truncate">{movie.title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {movie.year ? String(movie.year) : ""}
          {movie.year && movie.genre ? " · " : ""}
          {movie.genre ?? ""}
        </div>
      </div>
    </CarouselItem>
  );
}

function SeriesCard({
  series,
  onFocus,
  onClick,
}: {
  series: CatalogSeries;
  onFocus: () => void;
  onClick: () => void;
}) {
  const epCount = (series.seasons ?? []).reduce(
    (acc, s) => acc + (s.episodes?.length ?? 0),
    0,
  );
  return (
    <CarouselItem
      onFocus={onFocus}
      onMouseEnter={onFocus}
      onClick={onClick}
      className="w-[150px] md:w-[180px]"
      aria-label={series.title}
    >
      <Poster
        src={series.poster}
        title={series.title}
        subtitle={series.year ? String(series.year) : undefined}
        aspect="portrait"
        rounded="lg"
      />
      <div className="mt-2 px-0.5">
        <div className="text-sm font-medium truncate">{series.title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {series.seasons?.length ?? 0} temp.
          {epCount ? ` · ${epCount} ep.` : ""}
        </div>
      </div>
    </CarouselItem>
  );
}

function ChannelCard({
  channel,
  onFocus,
  onClick,
}: {
  channel: CatalogChannel;
  onFocus: () => void;
  onClick: () => void;
}) {
  return (
    <CarouselItem
      onFocus={onFocus}
      onMouseEnter={onFocus}
      onClick={onClick}
      className="w-[220px] md:w-[240px]"
      aria-label={channel.name}
    >
      <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-graphite/60 glass-card border border-white/10">
        <div className="absolute inset-0 grid place-items-center p-3">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              loading="lazy"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="text-2xl font-extrabold text-brand-gradient">
              {channel.name?.[0]?.toUpperCase() ?? "TV"}
            </div>
          )}
        </div>
        {channel.nowPlaying && (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-brand text-graphite">
            <span className="w-1.5 h-1.5 rounded-full bg-graphite animate-pulse" />
            AO VIVO
          </div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <div className="text-sm font-medium truncate">{channel.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {channel.nowPlaying?.title ?? "Sem programação"}
        </div>
      </div>
    </CarouselItem>
  );
}

function SectionHeaderExtra({ onClick, label = "Ver todos" }: { onClick: () => void; label?: string }) {
  return (
    <button
      data-focusable
      onClick={onClick}
      className="text-xs text-muted-foreground hover:text-brand inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite rounded px-1"
    >
      {label} <ChevronRight className="w-3 h-3" />
    </button>
  );
}

// ===========================================================
// Componente principal
// ===========================================================

export function AuroraDashboard() {
  const profile = useAppStore((s) => s.profile);
  const openPlayer = useAppStore((s) => s.openPlayer);
  const pushView = useAppStore((s) => s.pushView);
  const selectMovie = useAppStore((s) => s.selectMovie);
  const selectSeries = useAppStore((s) => s.selectSeries);
  const selectChannel = useAppStore((s) => s.selectChannel);

  const profileId = profile?.id;
  const queryClient = useQueryClient();

  const containerRef = useRef<HTMLDivElement>(null);
  useGridNavigation(containerRef, { selector: "[data-focusable]" });

  // ----- Queries -----
  const moviesQuery = useQuery({
    queryKey: ["catalog", "movies"],
    queryFn: () =>
      fetch("/api/catalog/movies?limit=20").then((r) => r.json()) as Promise<{
        items: CatalogMovie[];
      }>,
  });
  const seriesQuery = useQuery({
    queryKey: ["catalog", "series"],
    queryFn: () =>
      fetch("/api/catalog/series?limit=20").then((r) => r.json()) as Promise<{
        items: CatalogSeries[];
      }>,
  });
  const liveQuery = useQuery({
    queryKey: ["catalog", "live"],
    queryFn: () =>
      fetch("/api/catalog/live?limit=20").then((r) => r.json()) as Promise<{
        items: CatalogChannel[];
      }>,
  });
  const continueQuery = useQuery({
    queryKey: ["continue", profileId ?? "none"],
    enabled: !!profileId,
    queryFn: () =>
      fetch(
        `/api/history/continue?profileId=${encodeURIComponent(profileId!)}&limit=12`,
      ).then((r) => r.json()) as Promise<{ items: ContinueItem[] }>,
  });
  const favoritesQuery = useQuery({
    queryKey: ["favorites", profileId ?? "none"],
    enabled: !!profileId,
    queryFn: () =>
      fetch(`/api/favorites?profileId=${encodeURIComponent(profileId!)}`).then(
        (r) => r.json(),
      ) as Promise<{ favorites: { itemId: string; itemType: ItemType }[] }>,
  });

  const movies = moviesQuery.data?.items ?? [];
  const series = seriesQuery.data?.items ?? [];
  const channels = liveQuery.data?.items ?? [];
  const continueItems = continueQuery.data?.items ?? [];
  const favIds = useMemo(
    () => new Set((favoritesQuery.data?.favorites ?? []).map((f) => f.itemId)),
    [favoritesQuery.data],
  );

  // Featured = melhores avaliações; Recent = ordem do API (addedAt desc)
  const featuredMovies = useMemo(() => {
    const list = [...movies];
    list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list.slice(0, 12);
  }, [movies]);
  const recentMovies = useMemo(() => movies.slice(0, 12), [movies]);

  // ----- Foco + debounce -----
  // Foco é derivado: se o usuário não escolheu nada, default = primeiro filme
  // em destaque. Quando o usuário foca um item, setUserFocused o define.
  // Sem setState-in-effect: estado derivado via useMemo.
  const [userFocused, setUserFocused] = useState<AuroraFocused | null>(null);
  const initialFocus = useMemo<AuroraFocused | null>(
    () =>
      featuredMovies[0] ? { kind: "movie", data: featuredMovies[0] } : null,
    [featuredMovies],
  );
  const focused = userFocused ?? initialFocus;
  const debouncedFocused = useDebouncedValue(focused, 350);

  // ----- Hero info -----
  const heroInfo = useMemo(
    () => deriveHeroInfo(debouncedFocused),
    [debouncedFocused],
  );

  const focusedId = debouncedFocused
    ? debouncedFocused.kind === "continue"
      ? debouncedFocused.data.itemId
      : debouncedFocused.data.id
    : null;
  const isFav = focusedId ? favIds.has(focusedId) : false;

  // Progresso do filme em foco (para o botão "Continuar")
  const progressQuery = useQuery({
    queryKey: [
      "hero-progress",
      debouncedFocused?.kind ?? "none",
      focusedId ?? "none",
      profileId ?? "none",
    ],
    enabled:
      !!debouncedFocused &&
      !!profileId &&
      debouncedFocused.kind === "movie",
    queryFn: async () => {
      if (!debouncedFocused || debouncedFocused.kind !== "movie" || !profileId)
        return null;
      const res = await fetch(
        `/api/item/movie/${encodeURIComponent(debouncedFocused.data.id)}?profileId=${encodeURIComponent(profileId)}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.progress as
        | { position: number; duration: number; completed: boolean }
        | null;
    },
    staleTime: 30_000,
  });
  const hasProgress = !!(
    progressQuery.data &&
    !progressQuery.data.completed &&
    progressQuery.data.position > 0
  );

  // ----- Handlers -----
  const handleMovieClick = (m: CatalogMovie) => {
    selectMovie(m);
    pushView("movie-detail");
  };
  const handleSeriesClick = (s: CatalogSeries) => {
    selectSeries(s);
    pushView("series-detail");
  };
  const handleChannelClick = async (c: CatalogChannel) => {
    selectChannel(c);
    if (!profileId) {
      toast.error("Selecione um perfil para assistir.");
      return;
    }
    const item = await fetchPlayerItem("channel", c.id, profileId);
    if (item) openPlayer(item);
  };
  const handleContinueClick = async (it: ContinueItem) => {
    if (!profileId) {
      toast.error("Selecione um perfil para continuar.");
      return;
    }
    const item = await fetchPlayerItem(it.itemType, it.itemId, profileId);
    if (item) openPlayer(item);
  };

  const handleAssistir = async () => {
    if (!debouncedFocused || !profileId) {
      toast.error("Selecione um perfil para assistir.");
      return;
    }
    let item: PlayerItem | null = null;
    if (debouncedFocused.kind === "movie") {
      item = await fetchPlayerItem("movie", debouncedFocused.data.id, profileId);
    } else if (debouncedFocused.kind === "series") {
      const firstEp = debouncedFocused.data.seasons?.[0]?.episodes?.[0];
      if (!firstEp) {
        toast.error("Sem episódios disponíveis para esta série.");
        return;
      }
      item = await fetchPlayerItem("episode", firstEp.id, profileId);
    } else if (debouncedFocused.kind === "channel") {
      item = await fetchPlayerItem("channel", debouncedFocused.data.id, profileId);
    } else if (debouncedFocused.kind === "continue") {
      item = await fetchPlayerItem(
        debouncedFocused.data.itemType,
        debouncedFocused.data.itemId,
        profileId,
      );
    }
    if (item) openPlayer(item);
  };

  const handleDetalhes = () => {
    if (!debouncedFocused) return;
    if (debouncedFocused.kind === "movie") {
      selectMovie(debouncedFocused.data);
      pushView("movie-detail");
    } else if (debouncedFocused.kind === "series") {
      selectSeries(debouncedFocused.data);
      pushView("series-detail");
    } else if (debouncedFocused.kind === "channel") {
      selectChannel(debouncedFocused.data);
      pushView("live");
    }
  };

  const toggleFavorite = async () => {
    if (!debouncedFocused || !profileId) {
      toast.error("Selecione um perfil para favoritar.");
      return;
    }
    const f = debouncedFocused;
    const id = f.kind === "continue" ? f.data.itemId : f.data.id;
    const itemType: ItemType =
      f.kind === "movie"
        ? "movie"
        : f.kind === "series"
        ? "series"
        : f.kind === "channel"
        ? "channel"
        : f.data.itemType;
    const wasFav = favIds.has(id);
    try {
      if (wasFav) {
        await fetch(
          `/api/favorites?profileId=${encodeURIComponent(profileId)}&itemType=${itemType}&itemId=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        toast("Removido dos favoritos");
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId, itemType, itemId: id }),
        });
        toast.success("Adicionado aos favoritos");
      }
      queryClient.invalidateQueries({ queryKey: ["favorites", profileId] });
    } catch {
      toast.error("Erro ao atualizar favorito.");
    }
  };

  // ----- Render helpers -----
  const heroBackdropKey = heroInfo?.backdrop || "no-backdrop";
  const showDetalhes =
    debouncedFocused?.kind === "movie" || debouncedFocused?.kind === "series";
  const isContinueFocused = debouncedFocused?.kind === "continue";

  return (
    <div ref={containerRef} className="relative min-h-screen pb-24 md:pb-12">
      {/* ============== HERO ============== */}
      <section className="relative h-[58vh] min-h-[440px] max-h-[720px] overflow-hidden">
        {/* Backdrop animado (crossfade) */}
        <AnimatePresence>
          <motion.div
            key={heroBackdropKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <BackdropImage
              src={heroInfo?.backdrop ?? null}
              alt={heroInfo?.title ?? ""}
              className="absolute inset-0 h-full w-full"
            >
              <div className="absolute inset-0 bg-hero-overlay" />
              <div className="absolute inset-0 bg-hero-overlay-bottom" />
              <div className="absolute inset-0 bg-radial-brand opacity-50" />
            </BackdropImage>
          </motion.div>
        </AnimatePresence>

        {/* Mobile top bar */}
        <MobileTopBar />

        {/* Perfil (desktop) */}
        <div className="hidden md:flex absolute top-6 right-8 z-30">
          <button
            data-focusable
            onClick={() => pushView("profiles")}
            className="glass-card rounded-full pl-2 pr-3 py-1.5 flex items-center gap-2 hover:border-brand/50 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite"
            aria-label="Perfil"
          >
            <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 grid place-items-center text-brand font-bold text-sm">
              {profile?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <span className="text-sm font-medium max-w-[160px] truncate">
              {profile?.name ?? "Convidado"}
            </span>
          </button>
        </div>

        {/* Conteúdo do hero */}
        <div className="relative z-20 h-full flex flex-col justify-end md:justify-center px-6 md:px-12 pb-12 md:pb-0 pt-20 md:pt-0">
          <div className="max-w-2xl space-y-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={heroInfo?.title || "empty"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-5"
              >
                {heroInfo ? (
                  <>
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {heroInfo.badges.map((b, i) => (
                        <HeroBadge key={`${b}-${i}`}>
                          {b === "AO VIVO" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse mr-1.5" />
                          )}
                          {b}
                        </HeroBadge>
                      ))}
                    </div>

                    {/* Título */}
                    <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05]">
                      <span className="text-brand-gradient">
                        {heroInfo.title}
                      </span>
                    </h1>
                    {heroInfo.subtitle && (
                      <div className="text-base md:text-lg text-muted-foreground -mt-2">
                        {heroInfo.subtitle}
                      </div>
                    )}

                    {/* Meta */}
                    <MetaRow info={heroInfo} />

                    {/* Plot */}
                    {heroInfo.plot && (
                      <p className="text-sm md:text-base text-foreground/75 line-clamp-3 max-w-2xl">
                        {heroInfo.plot}
                      </p>
                    )}

                    {/* Botões */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {isContinueFocused ? (
                        <OrangeButton
                          variant="primary"
                          size="lg"
                          icon={<RotateCcw className="w-4 h-4" />}
                          onClick={handleAssistir}
                        >
                          Continuar
                        </OrangeButton>
                      ) : (
                        <OrangeButton
                          variant="primary"
                          size="lg"
                          icon={<Play className="w-4 h-4 fill-current" />}
                          onClick={handleAssistir}
                        >
                          Assistir
                        </OrangeButton>
                      )}

                      {hasProgress && !isContinueFocused && (
                        <OrangeButton
                          variant="secondary"
                          size="lg"
                          icon={<RotateCcw className="w-4 h-4" />}
                          onClick={handleAssistir}
                        >
                          Continuar
                        </OrangeButton>
                      )}

                      {showDetalhes && (
                        <OrangeButton
                          variant="glass"
                          size="lg"
                          icon={<Info className="w-4 h-4" />}
                          onClick={handleDetalhes}
                        >
                          Detalhes
                        </OrangeButton>
                      )}

                      <button
                        data-focusable
                        onClick={toggleFavorite}
                        aria-label={
                          isFav
                            ? "Remover dos favoritos"
                            : "Adicionar aos favoritos"
                        }
                        className={cn(
                          "w-12 h-12 rounded-xl glass border border-white/10 grid place-items-center transition-all",
                          "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
                          isFav
                            ? "text-brand border-brand/50 brand-glow-soft"
                            : "text-foreground/80 hover:text-brand hover:border-brand/40",
                        )}
                      >
                        <Heart
                          className={cn("w-5 h-5", isFav && "fill-brand")}
                        />
                      </button>
                    </div>
                  </>
                ) : (
                  // Skeleton de loading
                  <div className="space-y-3">
                    <div className="h-10 w-2/3 rounded-lg animate-shimmer" />
                    <div className="h-5 w-1/2 rounded-md animate-shimmer" />
                    <div className="h-20 w-full rounded-lg animate-shimmer" />
                    <div className="h-12 w-48 rounded-lg animate-shimmer" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ============== CARROSSÉIS ============== */}
      <div className="relative z-10 space-y-10 px-4 md:px-10 pt-4 md:pt-6">
        {/* Continue Assistindo */}
        {continueItems.length > 0 && (
          <Carousel title="Continue Assistindo" itemWidth={300}>
            {continueItems.map((it, i) => (
              <ContinueCard
                key={`continue-${it.itemId}-${i}`}
                item={it}
                onFocus={() => setUserFocused({ kind: "continue", data: it })}
                onClick={() => handleContinueClick(it)}
              />
            ))}
          </Carousel>
        )}

        {/* Em Destaque - Filmes */}
        {featuredMovies.length > 0 && (
          <Carousel
            title="Em Destaque — Filmes"
            itemWidth={180}
            headerExtra={
              <SectionHeaderExtra onClick={() => pushView("movies")} />
            }
          >
            {featuredMovies.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                onFocus={() => setUserFocused({ kind: "movie", data: m })}
                onClick={() => handleMovieClick(m)}
              />
            ))}
          </Carousel>
        )}

        {/* Séries Populares */}
        {series.length > 0 && (
          <Carousel
            title="Séries Populares"
            itemWidth={180}
            headerExtra={
              <SectionHeaderExtra
                onClick={() => pushView("series")}
                label="Ver todas"
              />
            }
          >
            {series.map((s) => (
              <SeriesCard
                key={s.id}
                series={s}
                onFocus={() => setUserFocused({ kind: "series", data: s })}
                onClick={() => handleSeriesClick(s)}
              />
            ))}
          </Carousel>
        )}

        {/* Canais ao Vivo */}
        {channels.length > 0 && (
          <Carousel
            title="Canais ao Vivo"
            itemWidth={240}
            headerExtra={
              <SectionHeaderExtra
                onClick={() => pushView("live")}
                label="Ver todos"
              />
            }
          >
            {channels.map((c) => (
              <ChannelCard
                key={c.id}
                channel={c}
                onFocus={() => setUserFocused({ kind: "channel", data: c })}
                onClick={() => handleChannelClick(c)}
              />
            ))}
          </Carousel>
        )}

        {/* Adicionados Recentemente */}
        {recentMovies.length > 0 && (
          <Carousel title="Adicionados Recentemente" itemWidth={180}>
            {recentMovies.map((m) => (
              <MovieCard
                key={`recent-${m.id}`}
                movie={m}
                onFocus={() => setUserFocused({ kind: "movie", data: m })}
                onClick={() => handleMovieClick(m)}
              />
            ))}
          </Carousel>
        )}

        {/* Estado vazio */}
        {!moviesQuery.isLoading &&
          !seriesQuery.isLoading &&
          !liveQuery.isLoading &&
          movies.length === 0 &&
          series.length === 0 &&
          channels.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center max-w-xl mx-auto">
              <div className="text-2xl font-bold mb-2">
                Sem conteúdo disponível
              </div>
              <div className="text-muted-foreground mb-4">
                Adicione um provedor Xtream ou M3U para começar a assistir.
              </div>
              <OrangeButton variant="primary" onClick={() => pushView("providers")}>
                Adicionar Fonte
              </OrangeButton>
            </div>
          )}
      </div>

      {/* ============== MOBILE BOTTOM NAV ============== */}
      <MobileBottomNav />
    </div>
  );
}
