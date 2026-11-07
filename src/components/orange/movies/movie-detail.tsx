"use client";

// ===========================================================
// MovieDetail — Detalhe do filme selecionado
// Hero com backdrop, poster, ações, plot e elenco.
// ===========================================================

import { useEffect, useState } from "react";
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
  RotateCcw,
  Loader2,
  Film,
  User,
  Clapperboard,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { Poster, BackdropImage } from "@/components/orange/poster";
import { OrangeButton } from "@/components/orange/orange-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CatalogMovie, FavoriteDTO, PlayerItem, ProgressDTO } from "@/types";

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

function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
}

// ===========================================================
// Componente principal
// ===========================================================

export function MovieDetail() {
  const profile = useAppStore((s) => s.profile);
  const profileId = profile?.id ?? "";
  const movie = useAppStore((s) => s.selectedMovie);
  const popView = useAppStore((s) => s.popView);
  const openPlayer = useAppStore((s) => s.openPlayer);
  const toastStore = useAppStore((s) => s.toast);

  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);

  // -------- Estado selecionado nulo → voltar --------
  if (!movie) {
    return <EmptyDetail onBack={popView} />;
  }

  return (
    <MovieDetailInner
      key={movie.id}
      movie={movie}
      profileId={profileId}
      popView={popView}
      openPlayer={openPlayer}
      toastStore={toastStore}
      queryClient={queryClient}
      starting={starting}
      setStarting={setStarting}
    />
  );
}

// ===========================================================
// Inner (mantém hooks estáveis)
// ===========================================================

function MovieDetailInner({
  movie,
  profileId,
  popView,
  openPlayer,
  toastStore,
  queryClient,
  starting,
  setStarting,
}: {
  movie: CatalogMovie;
  profileId: string;
  popView: () => void;
  openPlayer: (item: PlayerItem) => void;
  toastStore: (msg: string) => void;
  queryClient: ReturnType<typeof useQueryClient>;
  starting: boolean;
  setStarting: (v: boolean) => void;
}) {
  const [isFav, setIsFav] = useState(false);

  // -------- Favoritos --------
  const favQuery = useQuery<FavoriteDTO[]>({
    queryKey: ["favorites", profileId, "movie"],
    queryFn: async () => {
      const r = await fetch(
        `/api/favorites?profileId=${profileId}&type=movie`,
      );
      const j = (await r.json()) as FavoritesResponse;
      return j.favorites || [];
    },
    enabled: !!profileId,
  });

  // Atualiza estado de favorito quando a lista chega
  useEffect(() => {
    if (!favQuery.data) return;
    setIsFav(favQuery.data.some((f) => f.itemId === movie.id));
  }, [favQuery.data, movie.id]);

  const toggleFav = useMutation({
    mutationFn: async (action: "add" | "remove") => {
      if (action === "remove") {
        await fetch(
          `/api/favorites?profileId=${profileId}&itemType=movie&itemId=${movie.id}`,
          { method: "DELETE" },
        );
        return { action, exists: false };
      }
      const r = await fetch(`/api/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          itemType: "movie",
          itemId: movie.id,
        }),
      });
      const j = (await r.json()) as { ok: boolean; exists: boolean };
      return { action, exists: j.exists };
    },
    onMutate: async (action) => {
      await queryClient.cancelQueries({
        queryKey: ["favorites", profileId, "movie"],
      });
      const previous = queryClient.getQueryData<FavoriteDTO[]>([
        "favorites",
        profileId,
        "movie",
      ]);
      const next =
        action === "add"
          ? [
              ...(previous ?? []),
              {
                id: `tmp-${movie.id}`,
                itemType: "movie" as const,
                itemId: movie.id,
                title: movie.title || movie.name,
                poster: movie.poster ?? null,
                backdrop: movie.backdrop ?? null,
                createdAt: new Date().toISOString(),
              },
            ]
          : (previous ?? []).filter((f) => f.itemId !== movie.id);
      queryClient.setQueryData<FavoriteDTO[]>(
        ["favorites", profileId, "movie"],
        next,
      );
      setIsFav(action === "add");
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["favorites", profileId, "movie"],
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

  // -------- Progresso (banner) --------
  const progressQuery = useQuery<ProgressDTO | null>({
    queryKey: ["progress", profileId, "movie", movie.id],
    queryFn: async () => {
      const r = await fetch(
        `/api/history/progress?profileId=${profileId}&itemType=movie&itemId=${movie.id}`,
      );
      const j = await r.json();
      return (j.progress as ProgressDTO | null) ?? null;
    },
    enabled: !!profileId,
    refetchOnWindowFocus: false,
  });

  const hasProgress =
    !!progressQuery.data &&
    !progressQuery.data.completed &&
    progressQuery.data.position > 5 &&
    progressQuery.data.duration > 0;

  const pct =
    hasProgress && progressQuery.data
      ? Math.min(
          100,
          Math.round(
            (progressQuery.data.position / progressQuery.data.duration) * 100,
          ),
        )
      : 0;

  const completed = !!progressQuery.data?.completed;

  // -------- Ações --------
  const startPlayback = async () => {
    setStarting(true);
    try {
      const r = await fetch(
        `/api/item/movie/${movie.id}?profileId=${profileId}`,
      );
      const j = (await r.json()) as ItemResponse;
      if (j.item) {
        openPlayer(j.item);
      } else {
        toastStore("Filme indisponível.");
      }
    } catch {
      toastStore("Erro ao iniciar reprodução.");
    } finally {
      setStarting(false);
    }
  };

  const restart = async () => {
    setStarting(true);
    try {
      // Reset progress before opening player so resume dialog is skipped
      await fetch(`/api/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          itemType: "movie",
          itemId: movie.id,
          title: movie.title || movie.name,
          poster: movie.poster,
          backdrop: movie.backdrop,
          duration: progressQuery.data?.duration ?? 0,
          position: 0,
          completed: false,
        }),
      });
      await queryClient.invalidateQueries({
        queryKey: ["progress", profileId, "movie", movie.id],
      });
      await startPlayback();
    } finally {
      setStarting(false);
    }
  };

  const title = movie.title || movie.name;

  return (
    <div className="min-h-screen relative pb-20">
      {/* Hero backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative h-[60vh] min-h-[420px] w-full"
      >
        <BackdropImage src={movie.backdrop} alt={title} className="absolute inset-0">
          <div className="absolute inset-0 bg-hero-overlay" />
          <div className="absolute inset-0 bg-hero-overlay-bottom" />
        </BackdropImage>

        {/* Back button */}
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

        {/* Category badge top-right */}
        {movie.categoryName && (
          <div className="absolute top-6 right-6 z-20">
            <Badge
              variant="secondary"
              className="glass border-white/10 text-foreground"
            >
              <Film className="w-3 h-3" />
              {movie.categoryName}
            </Badge>
          </div>
        )}
      </motion.div>

      {/* Content overlap */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="relative z-10 px-6 md:px-10 max-w-[1400px] mx-auto -mt-32"
      >
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="w-[160px] h-[240px] md:w-[180px] md:h-[270px] rounded-xl overflow-hidden shadow-2xl border border-white/10 brand-glow-soft">
              <Poster
                src={movie.poster}
                title={title}
                subtitle={movie.year ? String(movie.year) : undefined}
                aspect="portrait"
                rounded="lg"
                className="w-full h-full"
                priority
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2 md:pt-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
              {title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              {movie.year != null && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {movie.year}
                </span>
              )}
              {movie.genre && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="truncate max-w-[260px]">{movie.genre}</span>
                </>
              )}
              {movie.rating != null && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {movie.rating.toFixed(1)}
                  </span>
                </>
              )}
              {movie.duration ? (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {fmtDur(movie.duration)}
                  </span>
                </>
              ) : null}
              {completed && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    Concluído
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
                onClick={startPlayback}
                disabled={starting}
              >
                Assistir
              </OrangeButton>

              {hasProgress && (
                <OrangeButton
                  variant="secondary"
                  size="lg"
                  icon={<RotateCcw className="w-4 h-4" />}
                  onClick={startPlayback}
                  disabled={starting}
                >
                  Continuar · {pct}%
                </OrangeButton>
              )}

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
                {isFav ? "Favoritado" : "Favoritar"}
              </OrangeButton>
            </div>

            {/* Progress banner */}
            {hasProgress && progressQuery.data && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-6 glass-card rounded-2xl p-4 border-white/10",
                  "flex flex-col sm:flex-row sm:items-center gap-4",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-widest text-brand font-semibold mb-1">
                    Você parou em
                  </div>
                  <div className="text-lg font-bold tabular-nums">
                    {fmtClock(progressQuery.data.position)} · {pct}% concluído
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand shadow-[0_0_8px_rgba(255,120,31,0.7)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <OrangeButton
                    variant="primary"
                    size="md"
                    icon={<Play className="w-4 h-4 fill-current" />}
                    onClick={startPlayback}
                    disabled={starting}
                  >
                    Continuar
                  </OrangeButton>
                  <OrangeButton
                    variant="glass"
                    size="md"
                    icon={<RotateCcw className="w-4 h-4" />}
                    onClick={restart}
                    disabled={starting}
                  >
                    Reiniciar
                  </OrangeButton>
                </div>
              </motion.div>
            )}

            {/* Plot */}
            {movie.plot && (
              <section className="mt-8">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  Sinopse
                </h2>
                <p className="text-foreground/85 leading-relaxed max-w-3xl">
                  {movie.plot}
                </p>
              </section>
            )}

            {/* Cast / Director */}
            {(movie.cast || movie.director) && (
              <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {movie.director && (
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                      <Clapperboard className="w-3.5 h-3.5" />
                      Direção
                    </h3>
                    <p className="text-foreground/85">{movie.director}</p>
                  </div>
                )}
                {movie.cast && (
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Elenco
                    </h3>
                    <p className="text-foreground/85">{movie.cast}</p>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ===========================================================
// Empty state — sem filme selecionado
// ===========================================================

function EmptyDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen px-6 py-20 flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-24 h-24 rounded-2xl glass-card grid place-items-center text-brand mb-6"
      >
        <Film className="w-12 h-12" />
      </motion.div>
      <h2 className="text-xl font-bold">Nenhum filme selecionado</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        Volte e escolha um filme do catálogo para ver os detalhes.
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
