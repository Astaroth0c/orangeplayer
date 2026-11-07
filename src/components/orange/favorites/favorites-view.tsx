"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Heart,
  Film,
  Clapperboard,
  Tv,
  Loader2,
  Layers,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useGridNavigation } from "@/hooks/use-spatial-nav";
import { Poster } from "@/components/orange/poster";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { placeholderPoster } from "@/lib/images";
import { toast } from "sonner";
import type { FavoriteDTO, ItemType, CatalogMovie, CatalogSeries } from "@/types";

type Filter = "all" | "movie" | "series" | "channel";

export function FavoritesView() {
  const profile = useAppStore((s) => s.profile);
  const profileId = profile?.id ?? "";
  const selectMovie = useAppStore((s) => s.selectMovie);
  const selectSeries = useAppStore((s) => s.selectSeries);
  const pushView = useAppStore((s) => s.pushView);
  const openPlayer = useAppStore((s) => s.openPlayer);
  const toastStore = useAppStore((s) => s.toast);

  const [filter, setFilter] = useState<Filter>("all");
  const gridRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const favQuery = useQuery<FavoriteDTO[]>({
    queryKey: ["favorites", profileId],
    queryFn: async () => {
      const r = await fetch(`/api/favorites?profileId=${profileId}`);
      const j = await r.json();
      return (j.favorites as FavoriteDTO[]) || [];
    },
    enabled: !!profileId,
  });

  const unfavorite = useMutation({
    mutationFn: async (fav: FavoriteDTO) => {
      await fetch(
        `/api/favorites?profileId=${profileId}&itemType=${fav.itemType}&itemId=${fav.itemId}`,
        { method: "DELETE" },
      );
      return fav;
    },
    onMutate: async (fav) => {
      await queryClient.cancelQueries({ queryKey: ["favorites", profileId] });
      const previous = queryClient.getQueryData<FavoriteDTO[]>([
        "favorites",
        profileId,
      ]);
      queryClient.setQueryData<FavoriteDTO[]>(["favorites", profileId], (old) =>
        (old ?? []).filter((f) => f.id !== fav.id),
      );
      return { previous };
    },
    onError: (_e, _fav, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["favorites", profileId], ctx.previous);
      }
      toast("Falha ao remover favorito.");
    },
    onSuccess: (fav) => {
      toast(`“${fav.title}” removido dos favoritos.`);
    },
  });

  const filtered = useMemo(() => {
    const list = favQuery.data ?? [];
    if (filter === "all") return list;
    return list.filter((f) => f.itemType === filter);
  }, [favQuery.data, filter]);

  useGridNavigation(gridRef);

  const openFavorite = async (fav: FavoriteDTO) => {
    if (fav.itemType === "movie") {
      // Build minimal CatalogMovie to push to detail
      const movie: CatalogMovie = {
        id: fav.itemId,
        providerId: "",
        streamId: "",
        name: fav.title,
        title: fav.title,
        poster: fav.poster ?? null,
        backdrop: fav.backdrop ?? null,
        streamUrl: "",
      };
      selectMovie(movie);
      pushView("movie-detail");
    } else if (fav.itemType === "series") {
      const series: CatalogSeries = {
        id: fav.itemId,
        providerId: "",
        seriesId: "",
        name: fav.title,
        title: fav.title,
        poster: fav.poster ?? null,
        backdrop: fav.backdrop ?? null,
        seasons: [],
      };
      selectSeries(series);
      pushView("series-detail");
    } else if (fav.itemType === "channel") {
      try {
        const r = await fetch(
          `/api/item/channel/${fav.itemId}?profileId=${profileId}`,
        );
        const j = await r.json();
        if (j.item) openPlayer(j.item);
        else toastStore("Canal indisponível.");
      } catch {
        toastStore("Erro ao abrir canal.");
      }
    }
  };

  const loading = favQuery.isLoading;
  const isEmpty = !loading && (favQuery.data?.length ?? 0) === 0;
  const isFilteredEmpty = !loading && filtered.length === 0 && !isEmpty;

  return (
    <div className="min-h-screen px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl glass-card grid place-items-center">
            <Heart className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Favoritos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Seus títulos salvos para assistir depois.
            </p>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="glass-card border border-white/10">
            <TabsTrigger value="all" data-focusable>
              Todos
            </TabsTrigger>
            <TabsTrigger value="movie" data-focusable>
              <Film className="w-3.5 h-3.5" /> Filmes
            </TabsTrigger>
            <TabsTrigger value="series" data-focusable>
              <Clapperboard className="w-3.5 h-3.5" /> Séries
            </TabsTrigger>
            <TabsTrigger value="channel" data-focusable>
              <Tv className="w-3.5 h-3.5" /> Canais
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <EmptyState
          icon={<Heart className="w-12 h-12" />}
          title="Nenhum favorito ainda"
          subtitle="Toque no coração em qualquer título para adicioná-lo aqui."
        />
      )}

      {/* Filtered empty */}
      {isFilteredEmpty && (
        <EmptyState
          icon={<Layers className="w-12 h-12" />}
          title="Nada por aqui"
          subtitle={`Nenhum favorito nesta categoria (${filterLabel(filter)}).`}
        />
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div
          ref={gridRef}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-12"
        >
          {filtered.map((fav) => (
            <FavoriteCard
              key={fav.id}
              fav={fav}
              onOpen={() => openFavorite(fav)}
              onUnfavorite={() => unfavorite.mutate(fav)}
              pending={unfavorite.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({
  fav,
  onOpen,
  onUnfavorite,
  pending,
}: {
  fav: FavoriteDTO;
  onOpen: () => void;
  onUnfavorite: () => void;
  pending: boolean;
}) {
  const isChannel = fav.itemType === "channel";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group relative card-lift rounded-xl overflow-hidden glass-card",
      )}
    >
      <button
        data-focusable
        onClick={onOpen}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite rounded-xl"
      >
        {isChannel ? (
          <div className="relative aspect-square overflow-hidden bg-graphite/60">
            <img
              src={fav.poster || placeholderPoster(fav.title)}
              alt={fav.title}
              className="absolute inset-0 h-full w-full object-contain p-4"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  placeholderPoster(fav.title);
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          </div>
        ) : (
          <Poster
            src={fav.poster}
            title={fav.title}
            aspect="portrait"
            rounded="lg"
          />
        )}
        <div className="p-3">
          <div className="text-sm font-semibold truncate">{fav.title}</div>
          <div className="mt-1 text-xs text-muted-foreground capitalize">
            {typeLabel(fav.itemType)}
          </div>
        </div>
      </button>

      {/* Unfavorite button */}
      <button
        data-focusable
        onClick={onUnfavorite}
        disabled={pending}
        aria-label="Remover dos favoritos"
        className={cn(
          "absolute top-2 right-2 w-9 h-9 rounded-full grid place-items-center transition-all",
          "bg-black/55 backdrop-blur-md border border-white/10 hover:bg-brand/20 hover:border-brand/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
        )}
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Heart className="w-4 h-4 text-brand fill-brand" />
        )}
      </button>
    </motion.div>
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

function filterLabel(f: Filter): string {
  return f === "all"
    ? "Todos"
    : f === "movie"
    ? "Filmes"
    : f === "series"
    ? "Séries"
    : "Canais";
}

function typeLabel(t: ItemType): string {
  if (t === "movie") return "Filme";
  if (t === "series") return "Série";
  if (t === "channel") return "Canal";
  return "Episódio";
}
