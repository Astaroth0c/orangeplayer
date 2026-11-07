"use client";

// ===========================================================
// LiveView — TV ao Vivo com grade de canais, EPG e favoritos
// ===========================================================

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Tv,
  Radio,
  Heart,
  ChevronRight,
  Filter,
  Play,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useGridNavigation } from "@/hooks/use-spatial-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { placeholderLogo } from "@/lib/images";
import type {
  CatalogChannel,
  EpgProgram,
  FavoriteDTO,
  PlayerItem,
} from "@/types";

// ===========================================================
// Tipos locais
// ===========================================================

interface CategoryItem {
  id: string;
  categoryId: string;
  name: string;
  type: string;
}

interface CategoriesResponse {
  groups: {
    movie: CategoryItem[];
    series: CategoryItem[];
    live: CategoryItem[];
  };
}

interface CatalogResponse {
  items: CatalogChannel[];
  total: number;
}

interface FavoritesResponse {
  favorites: FavoriteDTO[];
}

interface EpgResponse {
  programs: EpgProgram[];
  now: EpgProgram | null;
  next: EpgProgram | null;
}

interface ItemResponse {
  item: PlayerItem;
  progress: null;
}

// ===========================================================
// Helpers
// ===========================================================

function fmtTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ===========================================================
// Componente principal
// ===========================================================

export function LiveView() {
  const profile = useAppStore((s) => s.profile);
  const profileId = profile?.id ?? "";
  const openPlayer = useAppStore((s) => s.openPlayer);
  const toastStore = useAppStore((s) => s.toast);

  const [categoryId, setCategoryId] = useState<string>("all");
  const [showEpg, setShowEpg] = useState(false);
  const [favOnly, setFavOnly] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  // -------- Categorias --------
  const catsQuery = useQuery<CategoriesResponse>({
    queryKey: ["catalog-categories"],
    queryFn: async () => {
      const r = await fetch(`/api/catalog/categories`);
      return (await r.json()) as CategoriesResponse;
    },
    staleTime: 5 * 60 * 1000,
  });

  // -------- Canais --------
  const channelsQuery = useQuery<CatalogResponse>({
    queryKey: ["catalog-live", categoryId],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "500",
        offset: "0",
        sort: "recent",
      });
      if (categoryId !== "all") params.set("category", categoryId);
      const r = await fetch(`/api/catalog/live?${params.toString()}`);
      return (await r.json()) as CatalogResponse;
    },
  });

  // -------- Favoritos (canais) --------
  const favQuery = useQuery<FavoriteDTO[]>({
    queryKey: ["favorites", profileId, "channel"],
    queryFn: async () => {
      const r = await fetch(
        `/api/favorites?profileId=${profileId}&type=channel`,
      );
      const j = (await r.json()) as FavoritesResponse;
      return j.favorites || [];
    },
    enabled: !!profileId,
    staleTime: 30 * 1000,
  });

  const favIds = useMemo(
    () => new Set((favQuery.data ?? []).map((f) => f.itemId)),
    [favQuery.data],
  );

  const channels = useMemo(() => {
    const list = channelsQuery.data?.items ?? [];
    if (favOnly) return list.filter((c) => favIds.has(c.id));
    return list;
  }, [channelsQuery.data, favOnly, favIds]);

  useGridNavigation(gridRef);

  const categories = catsQuery.data?.groups?.live ?? [];
  const loading = channelsQuery.isLoading;
  const total = channels.length;

  const openChannel = async (c: CatalogChannel) => {
    try {
      const r = await fetch(
        `/api/item/channel/${c.id}?profileId=${profileId}`,
      );
      const j = (await r.json()) as ItemResponse;
      if (j.item) {
        openPlayer(j.item);
      } else {
        toastStore("Canal indisponível.");
      }
    } catch {
      toastStore("Erro ao sintonizar canal.");
    }
  };

  return (
    <div className="min-h-screen px-6 md:px-10 py-8 max-w-[1600px] mx-auto pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between gap-4 mb-6 flex-wrap"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl glass-card grid place-items-center">
            <Tv className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              TV ao Vivo
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading
                ? "Carregando canais..."
                : `${total} canal${total === 1 ? "" : "is"} disponíve${total === 1 ? "l" : "is"}`}
            </p>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-2">
          <ToggleChip
            active={favOnly}
            icon={<Heart className={cn("w-3.5 h-3.5", favOnly && "fill-current")} />}
            label="Favoritos"
            onClick={() => setFavOnly((v) => !v)}
          />
          <ToggleChip
            active={showEpg}
            icon={<Radio className="w-3.5 h-3.5" />}
            label="Guia EPG"
            onClick={() => setShowEpg((v) => !v)}
          />
        </div>
      </motion.div>

      {/* Category chips */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="relative -mx-2 mb-8 px-2"
      >
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 items-center">
          <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground/70 shrink-0 mr-1">
            <Filter className="w-3 h-3" />
            Categorias
          </span>
          <CategoryChip
            active={categoryId === "all"}
            label="Todos"
            onClick={() => setCategoryId("all")}
          />
          {catsQuery.isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-full" />
              ))
            : categories.map((c) => (
                <CategoryChip
                  key={c.id}
                  active={categoryId === c.categoryId}
                  label={c.name}
                  onClick={() => setCategoryId(c.categoryId)}
                />
              ))}
        </div>
      </motion.div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-xl animate-shimmer" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && channels.length === 0 && (
        <EmptyState
          icon={<Tv className="w-12 h-12" />}
          title={favOnly ? "Nenhum canal favorito" : "Nenhum canal disponível"}
          subtitle={
            favOnly
              ? "Adicione canais aos favoritos tocando no coração."
              : "Tente outra categoria ou verifique sua fonte de IPTV."
          }
        />
      )}

      {/* Grid */}
      {!loading && channels.length > 0 && (
        <div ref={gridRef} className="space-y-4">
          {channels.map((c) => (
            <ChannelCard
              key={c.id}
              channel={c}
              isFav={favIds.has(c.id)}
              showEpg={showEpg}
              onOpen={() => openChannel(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================
// Sub-componentes
// ===========================================================

function ToggleChip({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      data-focusable
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
        active
          ? "bg-brand text-graphite font-semibold shadow-[0_4px_16px_-6px_rgba(255,120,31,0.55)]"
          : "glass-card text-foreground/80 hover:text-brand hover:border-brand/40",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      data-focusable
      onClick={onClick}
      className={cn(
        "shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
        active
          ? "bg-brand text-graphite font-semibold shadow-[0_4px_16px_-6px_rgba(255,120,31,0.55)]"
          : "glass-card text-foreground/80 hover:text-brand hover:border-brand/40",
      )}
    >
      {label}
    </button>
  );
}

function ChannelCard({
  channel,
  isFav,
  showEpg,
  onOpen,
}: {
  channel: CatalogChannel;
  isFav: boolean;
  showEpg: boolean;
  onOpen: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group glass-card rounded-2xl overflow-hidden card-lift",
        "focus-within:ring-2 focus-within:ring-brand/50",
      )}
    >
      {/* Channel header */}
      <button
        data-focusable
        onClick={onOpen}
        aria-label={`Sintonizar ${channel.name}`}
        className={cn(
          "w-full flex items-center gap-4 p-4 text-left transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite rounded-2xl",
        )}
      >
        {/* Logo */}
        <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-graphite/60 grid place-items-center">
          <img
            src={channel.logo || placeholderLogo(channel.name)}
            alt={channel.name}
            loading="lazy"
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                placeholderLogo(channel.name);
            }}
          />
          {channel.num != null && (
            <span className="absolute top-1.5 left-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-foreground">
              {String(channel.num).padStart(3, "0")}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-widest">
              <span className="relative inline-flex">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              </span>
              Ao Vivo
            </span>
            <h3 className="text-base font-semibold truncate">{channel.name}</h3>
            {isFav && (
              <Heart className="w-3.5 h-3.5 text-brand fill-brand shrink-0" />
            )}
          </div>

          <div className="mt-1 text-xs text-muted-foreground truncate">
            {channel.categoryName || "Canal ao vivo"}
          </div>

          {/* Now playing */}
          {channel.nowPlaying ? (
            <div className="mt-2">
              <div className="text-sm font-medium truncate">
                {channel.nowPlaying.title}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand shadow-[0_0_8px_rgba(255,120,31,0.7)] transition-all"
                    style={{
                      width: `${Math.round((channel.nowPlaying.progress ?? 0) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {fmtTime(channel.nowPlaying.start)}–{fmtTime(channel.nowPlaying.end)}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-muted-foreground italic">
              Sem programação no momento
            </div>
          )}
        </div>

        {/* Play icon */}
        <div className="shrink-0 w-12 h-12 rounded-full glass-strong border border-brand/40 grid place-items-center text-brand transition group-hover:scale-110">
          <Play className="w-5 h-5 fill-brand" />
        </div>
      </button>

      {/* EPG strip */}
      {showEpg && <EpgStrip channelId={channel.id} />}
    </motion.div>
  );
}

// ===========================================================
// EpgStrip — faixa horizontal de programas próximos
// ===========================================================

function EpgStrip({ channelId }: { channelId: string }) {
  const epgQuery = useQuery<EpgResponse>({
    queryKey: ["epg", channelId],
    queryFn: async () => {
      const r = await fetch(`/api/epg/${channelId}`);
      return (await r.json()) as EpgResponse;
    },
    staleTime: 60 * 1000,
  });

  const programs = epgQuery.data?.programs ?? [];
  const now = epgQuery.data?.now ?? null;

  if (epgQuery.isLoading) {
    return (
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-44 rounded-lg shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="px-4 pb-4">
        <div className="text-xs text-muted-foreground italic px-2 py-3">
          Guia EPG indisponível para este canal.
        </div>
      </div>
    );
  }

  // Show current + next programs, limited to 8
  const nowIdx = now
    ? programs.findIndex((p) => p.id === now.id)
    : -1;
  const upcoming =
    nowIdx >= 0
      ? programs.slice(nowIdx)
      : programs.filter((p) => new Date(p.end).getTime() > Date.now());
  const visible = upcoming.slice(0, 8);

  return (
    <div className="px-4 pb-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-2 px-1">
        Programação
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {visible.map((p) => {
          const isNow = now?.id === p.id;
          const pct = Math.round((p.progress ?? 0) * 100);
          return (
            <div
              key={p.id}
              data-focusable
              tabIndex={0}
              className={cn(
                "shrink-0 w-44 rounded-lg p-3 border transition",
                isNow
                  ? "glass border-brand/50 brand-glow-soft"
                  : "glass border-white/10 hover:border-brand/30",
              )}
            >
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
                {fmtTime(p.start)}–{fmtTime(p.end)}
                {isNow && (
                  <span className="ml-auto text-red-400 font-bold uppercase tracking-widest">
                    Agora
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm font-semibold line-clamp-2">
                {p.title}
              </div>
              {isNow ? (
                <div className="mt-2 h-1 w-full bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              ) : (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {p.category || "Programa"}
                </div>
              )}
            </div>
          );
        })}
        <div className="shrink-0 w-10 grid place-items-center text-muted-foreground/40">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

// ===========================================================
// Empty state
// ===========================================================

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
