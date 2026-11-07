"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Clock,
  Film,
  Clapperboard,
  Tv,
  AlertCircle,
  Loader2,
  Star,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useKeyHandler, useGridNavigation } from "@/hooks/use-spatial-nav";
import { Poster } from "@/components/orange/poster";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { placeholderPoster } from "@/lib/images";
import { toast } from "sonner";
import type {
  CatalogMovie,
  CatalogSeries,
  CatalogChannel,
  SearchResult,
} from "@/types";

export function SearchView() {
  const profile = useAppStore((s) => s.profile);
  const profileId = profile?.id ?? "";
  const pushView = useAppStore((s) => s.pushView);
  const selectMovie = useAppStore((s) => s.selectMovie);
  const selectSeries = useAppStore((s) => s.selectSeries);
  const openPlayer = useAppStore((s) => s.openPlayer);
  const toastStore = useAppStore((s) => s.toast);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Autofocus
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const hasQuery = debounced.length >= 2;

  // Recent search history
  const historyQuery = useQuery<string[]>({
    queryKey: ["search-history", profileId],
    queryFn: async () => {
      const r = await fetch(`/api/search/history?profileId=${profileId}`);
      const j = await r.json();
      return (j.history as string[]) || [];
    },
    enabled: !!profileId,
  });

  // Search results
  const searchQuery = useQuery<SearchResult>({
    queryKey: ["search", debounced],
    queryFn: async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`);
      return (await r.json()) as SearchResult;
    },
    enabled: hasQuery,
  });

  // Save to search history (only when results return and query > 2 chars)
  const saveHistory = useMutation({
    mutationFn: async (q: string) => {
      await fetch("/api/search/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, query: q }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-history", profileId] });
    },
  });

  useEffect(() => {
    if (
      hasQuery &&
      searchQuery.isSuccess &&
      !searchQuery.isFetching &&
      profileId
    ) {
      saveHistory.mutate(debounced);
    }
  }, [searchQuery.isFetching, hasQuery, debounced]);

  const clearHistory = useMutation({
    mutationFn: async () => {
      await fetch(`/api/search/history?profileId=${profileId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-history", profileId] });
      toast("Histórico de busca limpo.");
    },
  });

  // Keyboard handling (Enter / Escape)
  useKeyHandler((e) => {
    if (e.key === "Escape") {
      if (query) {
        setQuery("");
        inputRef.current?.focus();
      }
    } else if (e.key === "Enter") {
      if (document.activeElement === inputRef.current && query.trim().length >= 2) {
        setDebounced(query.trim());
      }
    }
  });

  useGridNavigation(resultsRef);

  const openMovie = (m: CatalogMovie) => {
    selectMovie(m);
    pushView("movie-detail");
  };
  const openSeries = (s: CatalogSeries) => {
    selectSeries(s);
    pushView("series-detail");
  };
  const openChannel = async (c: CatalogChannel) => {
    try {
      const r = await fetch(
        `/api/item/channel/${c.id}?profileId=${profileId}`,
      );
      const j = await r.json();
      if (j.item) openPlayer(j.item);
      else toastStore("Canal indisponível.");
    } catch {
      toastStore("Erro ao abrir canal.");
    }
  };

  const movies = searchQuery.data?.movies ?? [];
  const series = searchQuery.data?.series ?? [];
  const channels = searchQuery.data?.channels ?? [];
  const total = movies.length + series.length + channels.length;
  const showNoResults = hasQuery && !searchQuery.isFetching && total === 0;

  return (
    <div className="relative min-h-screen px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl glass-card grid place-items-center">
          <Search className="w-6 h-6 text-brand" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Busca
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Encontre filmes, séries e canais no seu catálogo.
          </p>
        </div>
      </div>

      {/* Search input */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busque por filmes, séries e canais..."
          className={cn(
            "h-16 pl-14 pr-14 text-base md:text-lg rounded-2xl",
            "glass-card border-white/10 focus-visible:border-brand/60",
            "placeholder:text-muted-foreground/70",
          )}
          data-focusable
        />
        {query && (
          <button
            data-focusable
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass grid place-items-center hover:border-brand/50 transition"
            aria-label="Limpar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>

      {/* Recent search chips */}
      <AnimatePresence>
        {!hasQuery && (historyQuery.data?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground/70">
                <Clock className="w-3.5 h-3.5" />
                Buscas recentes
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearHistory.mutate()}
                disabled={clearHistory.isPending}
                className="text-muted-foreground hover:text-brand"
              >
                <X className="w-3.5 h-3.5" />
                Limpar histórico
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {historyQuery.data!.map((q) => (
                <button
                  key={q}
                  data-focusable
                  onClick={() => {
                    setQuery(q);
                    setDebounced(q);
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "px-3 h-9 rounded-full glass-card text-sm",
                    "hover:border-brand/60 hover:text-brand transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state (no query) */}
      {!hasQuery && (historyQuery.data?.length ?? 0) === 0 && (
        <EmptyState
          icon={<Search className="w-12 h-12" />}
          title="Busque por filmes, séries e canais"
          subtitle="Comece a digitar para ver resultados."
        />
      )}

      {/* Loading state (first load) */}
      {hasQuery && searchQuery.isFetching && total === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <span className="text-sm">Buscando por “{debounced}”...</span>
        </div>
      )}

      {/* No results */}
      {showNoResults && (
        <EmptyState
          icon={<AlertCircle className="w-12 h-12" />}
          title="Nenhum resultado encontrado"
          subtitle={
            <>
              Não encontramos nada para{" "}
              <span className="text-brand font-semibold">“{debounced}”</span>.
              Tente outro termo.
            </>
          }
        />
      )}

      {/* Results */}
      {hasQuery && total > 0 && (
        <div ref={resultsRef} className="mt-10 space-y-10 pb-12">
          {movies.length > 0 && (
            <ResultSection
              title="Filmes"
              icon={<Film className="w-4 h-4" />}
              count={movies.length}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {movies.map((m) => (
                  <MovieCard
                    key={m.id}
                    movie={m}
                    onClick={() => openMovie(m)}
                  />
                ))}
              </div>
            </ResultSection>
          )}

          {series.length > 0 && (
            <ResultSection
              title="Séries"
              icon={<Clapperboard className="w-4 h-4" />}
              count={series.length}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {series.map((s) => (
                  <SeriesCard
                    key={s.id}
                    series={s}
                    onClick={() => openSeries(s)}
                  />
                ))}
              </div>
            </ResultSection>
          )}

          {channels.length > 0 && (
            <ResultSection
              title="Canais"
              icon={<Tv className="w-4 h-4" />}
              count={channels.length}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {channels.map((c) => (
                  <ChannelCard
                    key={c.id}
                    channel={c}
                    onClick={() => openChannel(c)}
                  />
                ))}
              </div>
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg glass grid place-items-center text-brand">
          {icon}
        </div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
          {count}
        </span>
      </header>
      {children}
    </motion.section>
  );
}

function MovieCard({
  movie,
  onClick,
}: {
  movie: CatalogMovie;
  onClick: () => void;
}) {
  return (
    <button
      data-focusable
      onClick={onClick}
      className={cn(
        "group text-left card-lift rounded-xl overflow-hidden glass-card",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
      )}
    >
      <Poster
        src={movie.poster}
        title={movie.title || movie.name}
        subtitle={movie.year ? String(movie.year) : undefined}
        aspect="portrait"
        rounded="lg"
      />
      <div className="p-3">
        <div className="text-sm font-semibold truncate">
          {movie.title || movie.name}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {movie.year && <span>{movie.year}</span>}
          {movie.rating != null && (
            <span className="inline-flex items-center gap-0.5 text-brand">
              <Star className="w-3 h-3 fill-current" />
              {movie.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function SeriesCard({
  series,
  onClick,
}: {
  series: CatalogSeries;
  onClick: () => void;
}) {
  return (
    <button
      data-focusable
      onClick={onClick}
      className={cn(
        "group text-left card-lift rounded-xl overflow-hidden glass-card",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
      )}
    >
      <Poster
        src={series.poster}
        title={series.title || series.name}
        subtitle={series.year ? String(series.year) : undefined}
        aspect="portrait"
        rounded="lg"
      />
      <div className="p-3">
        <div className="text-sm font-semibold truncate">
          {series.title || series.name}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {series.year && <span>{series.year}</span>}
          {series.rating != null && (
            <span className="inline-flex items-center gap-0.5 text-brand">
              <Star className="w-3 h-3 fill-current" />
              {series.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ChannelCard({
  channel,
  onClick,
}: {
  channel: CatalogChannel;
  onClick: () => void;
}) {
  return (
    <button
      data-focusable
      onClick={onClick}
      className={cn(
        "group text-left card-lift rounded-xl overflow-hidden glass-card",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-graphite/60">
        <img
          src={channel.logo || placeholderPoster(channel.name)}
          alt={channel.name}
          className="absolute inset-0 h-full w-full object-contain p-4"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholderPoster(
              channel.name,
            );
          }}
        />
        {channel.num != null && (
          <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-foreground font-mono">
            {String(channel.num).padStart(3, "0")}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold truncate">{channel.name}</div>
        <div className="mt-1 text-xs text-muted-foreground truncate">
          {channel.categoryName || "Canal ao vivo"}
        </div>
      </div>
    </button>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-20 flex flex-col items-center text-center text-muted-foreground"
    >
      <div className="w-20 h-20 rounded-2xl glass-card grid place-items-center text-brand mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm">{subtitle}</p>
    </motion.div>
  );
}
