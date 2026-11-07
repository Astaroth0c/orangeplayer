"use client";

// ===========================================================
// SeriesView — Grade de séries com filtros e ordenação
// ===========================================================

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Clapperboard,
  Loader2,
  Star,
  ChevronDown,
  Layers,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useGridNavigation } from "@/hooks/use-spatial-nav";
import { Poster } from "@/components/orange/poster";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CatalogSeries } from "@/types";

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
  items: CatalogSeries[];
  total: number;
}

type SortMode = "recent" | "alpha" | "year";

// ===========================================================
// Constantes
// ===========================================================

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "recent", label: "Recentes" },
  { value: "alpha", label: "A–Z" },
  { value: "year", label: "Ano" },
];

const PAGE_SIZE = 24;
const MAX_LIMIT = 500;

// ===========================================================
// Componente principal
// ===========================================================

export function SeriesView() {
  const selectSeries = useAppStore((s) => s.selectSeries);
  const pushView = useAppStore((s) => s.pushView);

  const [state, setState] = useState<{
    categoryId: string;
    sort: SortMode;
    limit: number;
  }>({
    categoryId: "all",
    sort: "recent",
    limit: PAGE_SIZE,
  });

  const { categoryId, sort, limit } = state;
  const setCategory = (categoryId: string) =>
    setState((s) => ({ ...s, categoryId, limit: PAGE_SIZE }));
  const setSort = (sort: SortMode) =>
    setState((s) => ({ ...s, sort, limit: PAGE_SIZE }));
  const loadMore = () =>
    setState((s) => ({ ...s, limit: s.limit + PAGE_SIZE }));

  const gridRef = useRef<HTMLDivElement>(null);

  const catsQuery = useQuery<CategoriesResponse>({
    queryKey: ["catalog-categories"],
    queryFn: async () => {
      const r = await fetch(`/api/catalog/categories`);
      return (await r.json()) as CategoriesResponse;
    },
    staleTime: 5 * 60 * 1000,
  });

  const seriesQuery = useQuery<CatalogResponse>({
    queryKey: ["catalog-series", categoryId, sort, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: "0",
        sort,
      });
      if (categoryId !== "all") params.set("category", categoryId);
      const r = await fetch(`/api/catalog/series?${params.toString()}`);
      return (await r.json()) as CatalogResponse;
    },
  });

  useGridNavigation(gridRef);

  const categories = catsQuery.data?.groups?.series ?? [];
  const series = seriesQuery.data?.items ?? [];
  const loading = seriesQuery.isLoading;
  const fetchingMore = seriesQuery.isFetching && !loading;
  const total = seriesQuery.data?.total ?? series.length;
  const hasMore = series.length >= limit && limit < MAX_LIMIT && series.length > 0;

  const openSeries = (s: CatalogSeries) => {
    selectSeries(s);
    pushView("series-detail");
  };

  return (
    <div className="min-h-screen px-6 md:px-10 py-8 max-w-[1600px] mx-auto pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl glass-card grid place-items-center">
            <Clapperboard className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Séries
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading
                ? "Carregando catálogo..."
                : `${series.length} de ${total} série${series.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <SelectTrigger
            className="glass-card border-white/10 w-[140px]"
            data-focusable
          >
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent className="glass-strong border-white/10">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Filter chips */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="relative -mx-2 mb-8 px-2"
      >
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <CategoryChip
            active={categoryId === "all"}
            label="Todas"
            onClick={() => setCategory("all")}
          />
          {catsQuery.isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-full" />
              ))
            : categories.map((c) => (
                <CategoryChip
                  key={c.id}
                  active={categoryId === c.categoryId}
                  label={c.name}
                  onClick={() => setCategory(c.categoryId)}
                />
              ))}
        </div>
      </motion.div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] rounded-xl animate-shimmer" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && series.length === 0 && (
        <EmptyState
          icon={<Clapperboard className="w-12 h-12" />}
          title="Nenhuma série encontrada"
          subtitle="Tente outra categoria ou verifique sua fonte de IPTV."
        />
      )}

      {/* Grid */}
      {!loading && series.length > 0 && (
        <>
          <div
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {series.map((s) => (
              <SeriesCard key={s.id} series={s} onClick={() => openSeries(s)} />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                data-focusable
                onClick={loadMore}
                disabled={fetchingMore}
                className={cn(
                  "inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold",
                  "glass-card border-white/10 hover:border-brand/60 hover:text-brand transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
                  "disabled:opacity-50",
                )}
              >
                {fetchingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Carregar mais
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===========================================================
// Sub-componentes
// ===========================================================

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

function SeriesCard({
  series,
  onClick,
}: {
  series: CatalogSeries;
  onClick: () => void;
}) {
  const seasonsCount = series.seasons?.length ?? 0;
  const epCount =
    seasonsCount > 0
      ? series.seasons.reduce(
          (acc, sn) => acc + (sn.episodes?.length ?? 0),
          0,
        )
      : 0;
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
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
          {series.year != null && <span>{series.year}</span>}
          {seasonsCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Layers className="w-3 h-3" />
              {seasonsCount}T{epCount ? ` · ${epCount}ep` : ""}
            </span>
          )}
          {series.rating != null && (
            <span className="inline-flex items-center gap-0.5 text-brand">
              <Star className="w-3 h-3 fill-current" />
              {series.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </motion.button>
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
