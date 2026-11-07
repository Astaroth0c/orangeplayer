"use client";

// ===========================================================
// SeriesDetail — Detalhe de série com seasons e episodes
// ===========================================================

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Heart,
  Star,
  Clock,
  Calendar,
  Check,
  Loader2,
  Clapperboard,
  User,
  Layers,
  Tv,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { Poster, BackdropImage } from "@/components/orange/poster";
import { OrangeButton } from "@/components/orange/orange-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  CatalogSeries,
  CatalogEpisode,
  FavoriteDTO,
  PlayerItem,
  ProgressDTO,
} from "@/types";

// ===========================================================
// Tipos locais
// ===========================================================

interface FavoritesResponse {
  favorites: FavoriteDTO[];
}

interface ItemResponse {
  item: PlayerItem;
  progress: { position: number; duration: number; completed: boolean } | null;
}

interface CatalogResponse {
  items: CatalogSeries[];
  total: number;
}

interface ContinueItem {
  itemType: string;
  itemId: string;
  updatedAt: string;
}

// ===========================================================
// Helpers
// ===========================================================

function fmtDur(s?: number | null): string {
  if (!s) return "—";
  if (s < 3600) return `${Math.floor(s / 60)}min ${s % 60}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}min`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// ===========================================================
// Componente principal
// ===========================================================

export function SeriesDetail() {
  const profile = useAppStore((s) => s.profile);
  const profileId = profile?.id ?? "";
  const series = useAppStore((s) => s.selectedSeries);
  const popView = useAppStore((s) => s.popView);

  if (!series) {
    return <EmptyDetail onBack={popView} />;
  }

  return (
    <SeriesDetailInner
      key={series.id}
      series={series}
      profileId={profileId}
      popView={popView}
    />
  );
}

// ===========================================================
// Inner — todos os hooks estáveis
// ===========================================================

function SeriesDetailInner({
  series,
  profileId,
  popView,
}: {
  series: CatalogSeries;
  profileId: string;
  popView: () => void;
}) {
  const openPlayer = useAppStore((s) => s.openPlayer);
  const toastStore = useAppStore((s) => s.toast);
  const queryClient = useQueryClient();

  const [isFav, setIsFav] = useState(false);
  const [activeSeason, setActiveSeason] = useState<string>("");
  const [starting, setStarting] = useState(false);

  // -------- Busca série completa se vier de favoritos (sem seasons) --------
  const fullSeriesQuery = useQuery<CatalogSeries | null>({
    queryKey: ["series-full", series.id],
    queryFn: async () => {
      const r = await fetch(`/api/catalog/series?limit=500`);
      const j = (await r.json()) as CatalogResponse;
      return j.items.find((s) => s.id === series.id) ?? null;
    },
    enabled: series.seasons.length === 0,
    staleTime: 60 * 1000,
  });

  const effectiveSeries: CatalogSeries = useMemo(() => {
    if (fullSeriesQuery.data && fullSeriesQuery.data.seasons.length > 0) {
      return {
        ...series,
        ...fullSeriesQuery.data,
      };
    }
    return series;
  }, [series, fullSeriesQuery.data]);

  const seasons = effectiveSeries.seasons ?? [];

  // Default season ativa = primeira
  useEffect(() => {
    if (seasons.length > 0 && !activeSeason) {
      setActiveSeason(seasons[0].id);
    }
  }, [seasons, activeSeason]);

  const activeSeasonObj = useMemo(
    () => seasons.find((s) => s.id === activeSeason) ?? seasons[0] ?? null,
    [seasons, activeSeason],
  );

  // -------- Favoritos --------
  const favQuery = useQuery<FavoriteDTO[]>({
    queryKey: ["favorites", profileId, "series"],
    queryFn: async () => {
      const r = await fetch(
        `/api/favorites?profileId=${profileId}&type=series`,
      );
      const j = (await r.json()) as FavoritesResponse;
      return j.favorites || [];
    },
    enabled: !!profileId,
  });

  useEffect(() => {
    if (!favQuery.data) return;
    setIsFav(favQuery.data.some((f) => f.itemId === series.id));
  }, [favQuery.data, series.id]);

  const toggleFav = useMutation({
    mutationFn: async (action: "add" | "remove") => {
      if (action === "remove") {
        await fetch(
          `/api/favorites?profileId=${profileId}&itemType=series&itemId=${series.id}`,
          { method: "DELETE" },
        );
        return { action };
      }
      await fetch(`/api/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          itemType: "series",
          itemId: series.id,
        }),
      });
      return { action };
    },
    onMutate: async (action) => {
      await queryClient.cancelQueries({
        queryKey: ["favorites", profileId, "series"],
      });
      const previous = queryClient.getQueryData<FavoriteDTO[]>([
        "favorites",
        profileId,
        "series",
      ]);
      const next =
        action === "add"
          ? [
              ...(previous ?? []),
              {
                id: `tmp-${series.id}`,
                itemType: "series" as const,
                itemId: series.id,
                title: series.title || series.name,
                poster: series.poster ?? null,
                backdrop: series.backdrop ?? null,
                createdAt: new Date().toISOString(),
              },
            ]
          : (previous ?? []).filter((f) => f.itemId !== series.id);
      queryClient.setQueryData<FavoriteDTO[]>(
        ["favorites", profileId, "series"],
        next,
      );
      setIsFav(action === "add");
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["favorites", profileId, "series"],
          ctx.previous,
        );
      }
      setIsFav((v) => !v);
      toast("Não foi possível atualizar favoritos.");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["favorites", profileId],
      });
      toast(
        data.action === "add"
          ? "Adicionado aos favoritos."
          : "Removido dos favoritos.",
      );
    },
  });

  // -------- Lista de progresso em curso (para achar episódio para retomar) --------
  const continueQuery = useQuery<ContinueItem[]>({
    queryKey: ["history-continue", profileId],
    queryFn: async () => {
      const r = await fetch(
        `/api/history/continue?profileId=${profileId}&limit=100`,
      );
      const j = await r.json();
      return (j.items as ContinueItem[]) || [];
    },
    enabled: !!profileId && seasons.length > 0,
    staleTime: 30 * 1000,
  });

  // Episódios desta série em ordem
  const allEpisodes: CatalogEpisode[] = useMemo(() => {
    const list: CatalogEpisode[] = [];
    for (const sn of seasons) {
      for (const ep of sn.episodes ?? []) {
        list.push(ep);
      }
    }
    return list;
  }, [seasons]);

  const episodeToResume = useMemo(() => {
    const cont = continueQuery.data ?? [];
    if (cont.length === 0 || allEpisodes.length === 0) return null;
    const ids = new Set(allEpisodes.map((e) => e.id));
    const found = cont
      .filter((c) => c.itemType === "episode" && ids.has(c.itemId))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
    if (!found) return null;
    return allEpisodes.find((e) => e.id === found.itemId) ?? null;
  }, [continueQuery.data, allEpisodes]);

  const firstEpisode = allEpisodes[0] ?? null;

  // -------- Ações --------
  const playEpisode = async (epId: string) => {
    setStarting(true);
    try {
      const r = await fetch(
        `/api/item/episode/${epId}?profileId=${profileId}`,
      );
      const j = (await r.json()) as ItemResponse;
      if (j.item) {
        openPlayer(j.item);
      } else {
        toastStore("Episódio indisponível.");
      }
    } catch {
      toastStore("Erro ao iniciar reprodução.");
    } finally {
      setStarting(false);
    }
  };

  const startWatching = async () => {
    const target = episodeToResume ?? firstEpisode;
    if (!target) {
      toastStore("Nenhum episódio disponível.");
      return;
    }
    await playEpisode(target.id);
  };

  // -------- Render --------
  const title = effectiveSeries.title || effectiveSeries.name;
  const seasonsCount = seasons.length;
  const epCount = allEpisodes.length;
  const loadingFull = fullSeriesQuery.isLoading && seasons.length === 0;
  const hasNoSeasons = seasons.length === 0 && !loadingFull;

  return (
    <div className="min-h-screen relative pb-20">
      {/* Hero backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative h-[60vh] min-h-[420px] w-full"
      >
        <BackdropImage
          src={effectiveSeries.backdrop}
          alt={title}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-hero-overlay" />
          <div className="absolute inset-0 bg-hero-overlay-bottom" />
        </BackdropImage>

        <div className="absolute top-6 left-6 z-20">
          <button
            data-focusable
            onClick={popView}
            aria-label="Voltar"
            className={cn(
              "inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold",
              "glass-strong border border-white/10 text-foreground hover:border-brand/60 hover:text-brand transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        {effectiveSeries.categoryName && (
          <div className="absolute top-6 right-6 z-20">
            <Badge
              variant="secondary"
              className="glass border-white/10 text-foreground"
            >
              <Clapperboard className="w-3 h-3" />
              {effectiveSeries.categoryName}
            </Badge>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="relative z-10 px-6 md:px-10 max-w-[1400px] mx-auto -mt-32"
      >
        <div className="flex flex-col md:flex-row gap-8">
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="w-[160px] h-[240px] md:w-[180px] md:h-[270px] rounded-xl overflow-hidden shadow-2xl border border-white/10 brand-glow-soft">
              <Poster
                src={effectiveSeries.poster}
                title={title}
                subtitle={effectiveSeries.year ? String(effectiveSeries.year) : undefined}
                aspect="portrait"
                rounded="lg"
                className="w-full h-full"
                priority
              />
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-2 md:pt-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
              {title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              {effectiveSeries.year != null && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {effectiveSeries.year}
                </span>
              )}
              {effectiveSeries.genre && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="truncate max-w-[260px]">
                    {effectiveSeries.genre}
                  </span>
                </>
              )}
              {effectiveSeries.rating != null && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {effectiveSeries.rating.toFixed(1)}
                  </span>
                </>
              )}
              {seasonsCount > 0 && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {seasonsCount} T{epCount ? ` · ${epCount} ep` : ""}
                  </span>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <OrangeButton
                variant="primary"
                size="lg"
                icon={
                  starting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )
                }
                onClick={startWatching}
                disabled={starting || hasNoSeasons}
              >
                {episodeToResume
                  ? `Continuar · Ep ${episodeToResume.episodeNum}`
                  : "Assistir Episódio"}
              </OrangeButton>

              <OrangeButton
                variant="glass"
                size="lg"
                icon={
                  toggleFav.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart
                      className={cn("w-4 h-4", isFav && "fill-brand text-brand")}
                    />
                  )
                }
                onClick={() => toggleFav.mutate(isFav ? "remove" : "add")}
                disabled={toggleFav.isPending}
                aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                {isFav ? "Favoritada" : "Favoritar"}
              </OrangeButton>
            </div>

            {/* Plot */}
            {effectiveSeries.plot && (
              <section className="mt-8">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  Sinopse
                </h2>
                <p className="text-foreground/85 leading-relaxed max-w-3xl">
                  {effectiveSeries.plot}
                </p>
              </section>
            )}

            {/* Cast */}
            {effectiveSeries.cast && (
              <section className="mt-6">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Elenco
                </h3>
                <p className="text-foreground/85">{effectiveSeries.cast}</p>
              </section>
            )}
          </div>
        </div>

        {/* Seasons + Episodes */}
        <section className="mt-12">
          {loadingFull && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          )}

          {hasNoSeasons && (
            <div className="glass-card rounded-xl p-10 text-center">
              <Tv className="w-10 h-10 text-brand mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Episódios indisponíveis</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                Esta série não possui temporadas cadastradas nesta fonte de IPTV.
              </p>
            </div>
          )}

          {seasons.length > 0 && (
            <>
              {/* Season tabs */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground shrink-0 mr-2">
                  Temporadas
                </h2>
                {seasons.map((sn) => {
                  const isActive = activeSeasonObj?.id === sn.id;
                  return (
                    <button
                      key={sn.id}
                      data-focusable
                      onClick={() => setActiveSeason(sn.id)}
                      className={cn(
                        "shrink-0 h-9 px-4 rounded-lg text-sm font-semibold transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
                        isActive
                          ? "bg-brand text-graphite shadow-[0_4px_16px_-6px_rgba(255,120,31,0.55)]"
                          : "glass-card text-foreground/80 hover:text-brand hover:border-brand/40",
                      )}
                    >
                      {sn.name ? sn.name : `T${sn.seasonNumber}`}
                      <span
                        className={cn(
                          "ml-1.5 text-xs",
                          isActive ? "text-graphite/70" : "text-muted-foreground/70",
                        )}
                      >
                        {sn.episodes?.length ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Episodes */}
              <div className="space-y-3">
                {activeSeasonObj?.episodes?.map((ep) => (
                  <EpisodeRow
                    key={ep.id}
                    episode={ep}
                    profileId={profileId}
                    onPlay={() => playEpisode(ep.id)}
                    starting={starting}
                  />
                ))}
                {activeSeasonObj && (activeSeasonObj.episodes?.length ?? 0) === 0 && (
                  <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">
                    Nenhum episódio nesta temporada.
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </motion.div>
    </div>
  );
}

// ===========================================================
// EpisodeRow — linha individual de episódio com progresso
// ===========================================================

function EpisodeRow({
  episode,
  profileId,
  onPlay,
  starting,
}: {
  episode: CatalogEpisode;
  profileId: string;
  onPlay: () => void;
  starting: boolean;
}) {
  const progressQuery = useQuery<ProgressDTO | null>({
    queryKey: ["progress", profileId, "episode", episode.id],
    queryFn: async () => {
      const r = await fetch(
        `/api/history/progress?profileId=${profileId}&itemType=episode&itemId=${episode.id}`,
      );
      const j = await r.json();
      return (j.progress as ProgressDTO | null) ?? null;
    },
    enabled: !!profileId,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });

  const prog = progressQuery.data;
  const completed = !!prog?.completed;
  const pct =
    prog && !completed && prog.duration > 0
      ? Math.min(100, Math.round((prog.position / prog.duration) * 100))
      : 0;
  const hasProgress = pct > 0 && !completed;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      data-focusable
      onClick={onPlay}
      disabled={starting}
      className={cn(
        "group w-full text-left card-lift rounded-xl overflow-hidden glass-card",
        "flex items-stretch gap-0 transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
        "disabled:opacity-50",
        completed && "border-emerald-500/30",
      )}
    >
      {/* Episode number badge */}
      <div className="shrink-0 w-14 md:w-16 grid place-items-center glass border-r border-white/10">
        <span className="text-2xl font-extrabold tabular-nums text-brand">
          {String(episode.episodeNum).padStart(2, "0")}
        </span>
      </div>

      {/* Thumbnail */}
      <div className="shrink-0 w-[180px] md:w-[220px] aspect-video relative overflow-hidden bg-graphite/60">
        <Poster
          src={episode.poster}
          title={episode.title}
          aspect="landscape"
          rounded="lg"
          className="w-full h-full"
        />
        <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-11 h-11 rounded-full glass-strong border border-brand/50 grid place-items-center text-brand">
            <Play className="w-5 h-5 fill-brand" />
          </div>
        </div>
        {completed && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-semibold backdrop-blur">
            <Check className="w-3 h-3" />
            Concluído
          </div>
        )}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/15">
            <div
              className="h-full bg-brand shadow-[0_0_8px_rgba(255,120,31,0.7)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/80">
            Episódio {episode.episodeNum}
          </span>
          {episode.duration ? (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {fmtDur(episode.duration)}
              </span>
            </>
          ) : null}
          {episode.airDate && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {fmtDate(episode.airDate)}
              </span>
            </>
          )}
          {hasProgress && (
            <span className="ml-auto text-brand font-semibold">
              {pct}% assistido
            </span>
          )}
        </div>
        <div className="mt-1 text-sm md:text-base font-semibold line-clamp-1">
          {episode.title}
        </div>
        {episode.overview && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {episode.overview}
          </p>
        )}
      </div>
    </motion.button>
  );
}

// ===========================================================
// Empty state — sem série selecionada
// ===========================================================

function EmptyDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen px-6 py-20 flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-24 h-24 rounded-2xl glass-card grid place-items-center text-brand mb-6"
      >
        <Clapperboard className="w-12 h-12" />
      </motion.div>
      <h2 className="text-xl font-bold">Nenhuma série selecionada</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        Volte e escolha uma série do catálogo para ver os detalhes.
      </p>
      <OrangeButton
        variant="primary"
        size="lg"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={onBack}
        className="mt-6"
      >
        Voltar
      </OrangeButton>
    </div>
  );
}
