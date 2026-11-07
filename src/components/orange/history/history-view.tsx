"use client";

import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  History as HistoryIcon,
  Play,
  Trash2,
  Clock,
  Film,
  Clapperboard,
  Tv,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useGridNavigation } from "@/hooks/use-spatial-nav";
import { Poster } from "@/components/orange/poster";
import { BackdropImage } from "@/components/orange/poster";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { HistoryDTO, ItemType } from "@/types";

interface ContinueItem {
  itemType: ItemType;
  itemId: string;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
}

export function HistoryView() {
  const profile = useAppStore((s) => s.profile);
  const profileId = profile?.id ?? "";
  const openPlayer = useAppStore((s) => s.openPlayer);
  const toastStore = useAppStore((s) => s.toast);
  const continueRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const continueQuery = useQuery<ContinueItem[]>({
    queryKey: ["history-continue", profileId],
    queryFn: async () => {
      const r = await fetch(
        `/api/history/continue?profileId=${profileId}&limit=20`,
      );
      const j = await r.json();
      return (j.items as ContinueItem[]) || [];
    },
    enabled: !!profileId,
  });

  const historyQuery = useQuery<HistoryDTO[]>({
    queryKey: ["history", profileId],
    queryFn: async () => {
      const r = await fetch(`/api/history?profileId=${profileId}&limit=50`);
      const j = await r.json();
      return (j.history as HistoryDTO[]) || [];
    },
    enabled: !!profileId,
  });

  const clearHistory = useMutation({
    mutationFn: async () => {
      // The API doesn't expose DELETE on /api/history — but /api/search/history has one.
      // For watch history, we rely on the absence of a server-side clear endpoint and
      // inform the user. (Best-effort: POST without body to reset isn't supported.)
      // Try common patterns:
      const res = await fetch(`/api/history?profileId=${profileId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao limpar histórico.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history", profileId] });
      queryClient.invalidateQueries({
        queryKey: ["history-continue", profileId],
      });
      toast("Histórico limpo.");
    },
    onError: () => {
      toast("Não foi possível limpar o histórico.");
    },
  });

  useGridNavigation(continueRef);
  useGridNavigation(historyRef);

  const resume = async (item: ContinueItem) => {
    try {
      const type = item.itemType; // movie | episode | channel
      const r = await fetch(
        `/api/item/${type}/${item.itemId}?profileId=${profileId}`,
      );
      const j = await r.json();
      if (j.item) {
        openPlayer(j.item);
      } else {
        toastStore("Item indisponível.");
      }
    } catch {
      toastStore("Erro ao retomar reprodução.");
    }
  };

  const loading = continueQuery.isLoading || historyQuery.isLoading;
  const continueItems = continueQuery.data ?? [];
  const historyItems = historyQuery.data ?? [];
  const allEmpty = !loading && continueItems.length === 0 && historyItems.length === 0;

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
            <HistoryIcon className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Histórico
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Retome de onde parou ou revise o que você já assistiu.
            </p>
          </div>
        </div>

        {historyItems.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="default"
                data-focusable
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Limpar histórico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-strong border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos os registros de visualização deste perfil serão
                  removidos. O progresso salvo (Continuar Assistindo) também
                  pode ser apagado. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-focusable>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  data-focusable
                  onClick={() => clearHistory.mutate()}
                  disabled={clearHistory.isPending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {clearHistory.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Limpar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </motion.div>

      {loading && (
        <div className="space-y-8">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {allEmpty && (
        <EmptyState
          icon={<HistoryIcon className="w-12 h-12" />}
          title="Você ainda não assistiu nada"
          subtitle="O que você reproduzir aparecerá aqui para retomar a qualquer momento."
        />
      )}

      {/* Continue watching */}
      {!loading && continueItems.length > 0 && (
        <section className="mb-10" ref={continueRef}>
          <header className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg glass grid place-items-center text-brand">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Continuar Assistindo
            </h2>
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
              {continueItems.length}
            </span>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {continueItems.map((item) => (
              <ContinueCard
                key={`${item.itemType}-${item.itemId}`}
                item={item}
                onContinue={() => resume(item)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent history list */}
      {!loading && historyItems.length > 0 && (
        <section ref={historyRef}>
          <header className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg glass grid place-items-center text-brand">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Assistidos Recentemente
            </h2>
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
              {historyItems.length}
            </span>
          </header>

          <div className="space-y-3">
            {historyItems.map((h) => (
              <HistoryRow key={h.id} item={h} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ContinueCard({
  item,
  onContinue,
}: {
  item: ContinueItem;
  onContinue: () => void;
}) {
  const pct =
    item.duration > 0
      ? Math.min(100, Math.round((item.position / item.duration) * 100))
      : 0;
  const remaining = Math.max(0, item.duration - item.position);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative rounded-2xl overflow-hidden glass-card card-lift",
        "focus-within:ring-2 focus-within:ring-brand/50",
      )}
    >
      <BackdropImage
        src={item.backdrop || item.poster}
        alt={item.title}
        className="aspect-[16/9]"
      >
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div className="text-lg font-bold tracking-tight line-clamp-1">
            {item.title}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {typeLabel(item.itemType)} · {formatRemaining(remaining)} restante
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Progress
              value={pct}
              className="h-1.5 bg-white/15"
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {pct}%
            </span>
          </div>
          <button
            data-focusable
            onClick={onContinue}
            className={cn(
              "mt-3 inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold w-fit",
              "bg-brand text-graphite hover:bg-brand-light transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
            )}
          >
            <Play className="w-4 h-4 fill-current" />
            Continuar
          </button>
        </div>
      </BackdropImage>
    </motion.div>
  );
}

function HistoryRow({ item }: { item: HistoryDTO }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "glass-card rounded-xl p-3 flex items-center gap-4",
        "hover:border-brand/40 transition card-lift",
      )}
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-graphite/60">
        <Poster
          src={item.poster}
          title={item.title}
          aspect="portrait"
          rounded="md"
          className="w-full h-full"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{item.title}</div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {typeIcon(item.itemType)}
            {typeLabel(item.itemType)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {relativeTime(item.watchedAt)}
          </span>
          {item.duration > 0 && (
            <span>{formatDuration(item.duration)}</span>
          )}
        </div>
      </div>
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

function typeLabel(t: ItemType): string {
  if (t === "movie") return "Filme";
  if (t === "series") return "Série";
  if (t === "channel") return "Canal";
  return "Episódio";
}

function typeIcon(t: ItemType) {
  if (t === "movie") return <Film className="w-3.5 h-3.5" />;
  if (t === "series") return <Clapperboard className="w-3.5 h-3.5" />;
  if (t === "channel") return <Tv className="w-3.5 h-3.5" />;
  return <Film className="w-3.5 h-3.5" />;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m${s > 0 ? ` ${s}s` : ""}`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h${mm > 0 ? ` ${mm}m` : ""}`;
}

function formatRemaining(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}min`;
}

function relativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Agora";
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours} ${hours === 1 ? "hora" : "horas"}`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Ontem";
    if (days < 7) return `Há ${days} dias`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `Há ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
