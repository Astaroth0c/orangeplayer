"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Server,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  Radio,
  FileText,
  Plug,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useGridNavigation } from "@/hooks/use-spatial-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
import type { ProviderDTO, ProviderType } from "@/types";

export function ProvidersView() {
  const setProviders = useAppStore((s) => s.setProviders);
  const gridRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const providersQuery = useQuery<ProviderDTO[]>({
    queryKey: ["providers"],
    queryFn: async () => {
      const r = await fetch("/api/providers");
      const j = await r.json();
      return (j.providers as ProviderDTO[]) || [];
    },
  });

  // Sync store with query data
  useEffect(() => {
    if (providersQuery.data) setProviders(providersQuery.data);
  }, [providersQuery.data, setProviders]);

  useGridNavigation(gridRef);

  const syncProvider = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/providers/${id}/sync`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao sincronizar.");
      return { itemCount: j.itemCount as number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast(`Sincronização concluída. ${data.itemCount} itens.`);
    },
    onError: (e) =>
      toast(e instanceof Error ? e.message : "Erro ao sincronizar."),
  });

  const deleteProvider = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/providers?id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao excluir.");
      return j;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast("Fonte excluída.");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Erro ao excluir."),
  });

  const addProvider = useMutation({
    mutationFn: async (body: {
      name: string;
      type: ProviderType;
      serverUrl?: string;
      username?: string;
      password?: string;
      m3uUrl?: string;
    }) => {
      const r = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao criar fonte.");
      return j.provider as ProviderDTO;
    },
    onSuccess: (provider) => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast(`Fonte “${provider.name}” adicionada. Sincronizando...`);
      // Auto-sync after creation
      syncProvider.mutate(provider.id);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Erro ao adicionar fonte."),
  });

  const [addOpen, setAddOpen] = useState(false);

  const providers = providersQuery.data ?? [];
  const loading = providersQuery.isLoading;

  return (
    <div className="min-h-screen px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl glass-card grid place-items-center">
            <Server className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Fontes
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie seus provedores de IPTV (Xtream Codes e listas M3U).
            </p>
          </div>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          data-focusable
          size="default"
          className="bg-brand text-graphite hover:bg-brand-light"
        >
          <Plus className="w-4 h-4" />
          Adicionar fonte
        </Button>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={<Server className="w-12 h-12" />}
          title="Nenhuma fonte configurada"
          subtitle="Adicione um provedor Xtream Codes ou uma lista M3U para começar."
        />
      ) : (
        <div ref={gridRef} className="space-y-3 pb-12">
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              syncing={
                syncProvider.isPending && syncProvider.variables === p.id
              }
              onSync={() => syncProvider.mutate(p.id)}
              onDelete={() => deleteProvider.mutate(p.id)}
              deleting={deleteProvider.isPending}
            />
          ))}
        </div>
      )}

      {/* Add provider dialog */}
      <AddProviderDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(body) => {
          addProvider.mutate(body);
          setAddOpen(false);
        }}
        pending={addProvider.isPending}
      />
    </div>
  );
}

function ProviderCard({
  provider,
  syncing,
  onSync,
  onDelete,
  deleting,
}: {
  provider: ProviderDTO;
  syncing: boolean;
  onSync: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const isReady = provider.status === "ready";
  const isError = provider.status === "error";
  const isSyncing = provider.status === "syncing" || syncing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4",
      )}
    >
      {/* Left: identity */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            "w-12 h-12 rounded-xl grid place-items-center shrink-0",
            "glass text-brand border border-white/10",
          )}
        >
          {provider.type === "xtream" ? (
            <Plug className="w-5 h-5" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold tracking-tight truncate">
              {provider.name}
            </h3>
            <TypeBadge type={provider.type} />
            <StatusBadge
              status={provider.status}
              isSyncing={isSyncing}
              isError={isError}
              isReady={isReady}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Server className="w-3 h-3" />
              {provider.itemCount.toLocaleString("pt-BR")} itens
            </span>
            {provider.lastSyncAt && (
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Última sync: {relativeTime(provider.lastSyncAt)}
              </span>
            )}
            {isError && provider.lastError && (
              <span
                className="inline-flex items-center gap-1 text-destructive truncate max-w-xs"
                title={provider.lastError}
              >
                <AlertCircle className="w-3 h-3 shrink-0" />
                {provider.lastError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={onSync}
            disabled={syncing}
            data-focusable
            className="glass border border-white/10 hover:border-brand/40"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Sincronizar agora
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={deleting}
                data-focusable
                className="glass border border-white/10 text-muted-foreground hover:text-destructive hover:border-destructive/40"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-strong border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir fonte?</AlertDialogTitle>
                <AlertDialogDescription>
                  A fonte <strong>{provider.name}</strong> será removida e
                  todo o catálogo associado (filmes, séries, canais) será
                  apagado. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-focusable>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  data-focusable
                  onClick={onDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </div>
    </motion.div>
  );
}

function TypeBadge({ type }: { type: ProviderType }) {
  if (type === "xtream") {
    return (
      <Badge variant="outline" className="border-brand/40 text-brand">
        Xtream
      </Badge>
    );
  }
  if (type === "m3u") {
    return (
      <Badge variant="outline" className="border-sky-500/40 text-sky-300">
        M3U
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-brand/30 text-brand">
      Demo
    </Badge>
  );
}

function StatusBadge({
  status,
  isSyncing,
  isError,
  isReady,
}: {
  status: string;
  isSyncing: boolean;
  isError: boolean;
  isReady: boolean;
}) {
  if (isSyncing || status === "syncing") {
    return (
      <Badge className="bg-brand/15 text-brand border border-brand/30 animate-pulse-brand">
        <Loader2 className="w-3 h-3 animate-spin" />
        Sincronizando
      </Badge>
    );
  }
  if (isError || status === "error") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="w-3 h-3" />
        Erro
      </Badge>
    );
  }
  if (isReady || status === "ready") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 text-emerald-400 gap-1"
      >
        <Check className="w-3 h-3" />
        Pronto
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-white/15 text-muted-foreground">
      <Radio className="w-3 h-3" />
      Ocioso
    </Badge>
  );
}

function AddProviderDialog({
  open,
  onOpenChange,
  onAdd,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (body: {
    name: string;
    type: ProviderType;
    serverUrl?: string;
    username?: string;
    password?: string;
    m3uUrl?: string;
  }) => void;
  pending: boolean;
}) {
  const [type, setType] = useState<ProviderType>("xtream");
  const [name, setName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [m3uUrl, setM3uUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(null);

  useEffect(() => {
    if (!open) {
      setType("xtream");
      setName("");
      setServerUrl("");
      setUsername("");
      setPassword("");
      setM3uUrl("");
      setTesting(false);
      setTestResult(null);
    }
  }, [open]);

  const canSubmit = (() => {
    if (!name.trim()) return false;
    if (type === "xtream") return !!serverUrl.trim() && !!username.trim() && !!password.trim();
    if (type === "m3u") return !!m3uUrl.trim();
    return false;
  })();

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (type === "xtream") {
        if (!serverUrl.trim() || !username.trim() || !password.trim()) {
          setTestResult({ ok: false, msg: "Preencha URL, usuário e senha." });
          return;
        }
        // Best-effort: try to reach player_api.php
        const url = new URL("/player_api.php", serverUrl.trim());
        url.searchParams.set("username", username.trim());
        url.searchParams.set("password", password.trim());
        const r = await fetch(url.toString(), {
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (j?.user_info?.auth === 0) {
          setTestResult({ ok: false, msg: "Credenciais inválidas." });
          return;
        }
        setTestResult({ ok: true, msg: "Conexão bem-sucedida." });
      } else if (type === "m3u") {
        if (!m3uUrl.trim()) {
          setTestResult({ ok: false, msg: "Informe a URL M3U." });
          return;
        }
        const r = await fetch(m3uUrl.trim(), {
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (!text.includes("#EXTM3U")) {
          setTestResult({ ok: false, msg: "Resposta não é uma lista M3U válida." });
          return;
        }
        const lines = text.split("\n").filter((l) => l.startsWith("#EXTINF")).length;
        setTestResult({ ok: true, msg: `Lista válida com ${lines} entradas.` });
      }
    } catch (e) {
      setTestResult({
        ok: false,
        msg: e instanceof Error ? e.message : "Erro ao testar conexão.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd({
      name: name.trim(),
      type,
      serverUrl: type === "xtream" ? serverUrl.trim() : undefined,
      username: type === "xtream" ? username.trim() : undefined,
      password: type === "xtream" ? password.trim() : undefined,
      m3uUrl: type === "m3u" ? m3uUrl.trim() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar fonte</DialogTitle>
          <DialogDescription>
            Conecte um provedor Xtream Codes, uma lista M3U ou use o catálogo demo.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => setType(v as ProviderType)}>
          <TabsList className="glass-card border border-white/10 w-full">
            <TabsTrigger value="xtream" data-focusable>
              <Plug className="w-3.5 h-3.5" /> Xtream
            </TabsTrigger>
            <TabsTrigger value="m3u" data-focusable>
              <FileText className="w-3.5 h-3.5" /> M3U
            </TabsTrigger>
          </TabsList>

          <TabsContent value="xtream" className="space-y-3 mt-4">
            <Field
              id="x-name"
              label="Nome"
              value={name}
              onChange={setName}
              placeholder="Ex.: Meu Provedor"
            />
            <Field
              id="x-server"
              label="URL do servidor"
              value={serverUrl}
              onChange={setServerUrl}
              placeholder="http://provider.tv:8080"
            />
            <Field
              id="x-user"
              label="Usuário"
              value={username}
              onChange={setUsername}
              placeholder="seu_usuario"
            />
            <Field
              id="x-pass"
              label="Senha"
              value={password}
              onChange={setPassword}
              placeholder="sua_senha"
              type="password"
            />
          </TabsContent>

          <TabsContent value="m3u" className="space-y-3 mt-4">
            <Field
              id="m-name"
              label="Nome"
              value={name}
              onChange={setName}
              placeholder="Ex.: Minha Lista"
            />
            <Field
              id="m-url"
              label="URL M3U"
              value={m3uUrl}
              onChange={setM3uUrl}
              placeholder="http://provider.tv/lista.m3u"
            />
          </TabsContent>
        </Tabs>

        {testResult && (
          <div
            className={cn(
              "rounded-lg p-3 text-sm border flex items-start gap-2",
              testResult.ok
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            {testResult.ok ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{testResult.msg}</span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleTest}
            disabled={testing || !canSubmit}
            data-focusable
            className="glass border border-white/10"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plug className="w-4 h-4" />
            )}
            Testar conexão
          </Button>
          <div className="flex-1" />
          <DialogClose asChild>
            <Button variant="ghost" data-focusable>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || pending}
            data-focusable
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-focusable
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      />
    </div>
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

function relativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "ontem";
    if (days < 7) return `há ${days}d`;
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}
