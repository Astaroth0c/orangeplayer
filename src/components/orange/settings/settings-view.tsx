"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Palette,
  Play,
  Subtitles,
  Volume2,
  ShieldCheck,
  Cloud,
  Info,
  Trash2,
  Save,
  Loader2,
  Check,
  Heart,
  Database,
  Server,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface AppSettings {
  // Aparência
  theme?: string;
  uiDensity?: "compact" | "comfortable" | "expanded";
  posterSize?: "sm" | "md" | "lg";
  reduceMotion?: boolean;
  // Reprodução
  autoplayNext?: boolean;
  skipIntro?: boolean;
  defaultSpeed?: number;
  hwAccel?: boolean;
  bufferProfile?: "low" | "auto" | "high";
  // Legendas
  subtitleEnabled?: boolean;
  subtitleLang?: "por" | "eng" | "spa";
  subtitleSize?: "sm" | "md" | "lg" | "xl";
  subtitleColor?: string;
  subtitleBg?: boolean;
  // Áudio
  audioLang?: "por" | "eng" | "spa";
  // Parental
  parentalControl?: boolean;
  maxRating?: string;
  // Sync
  syncEnabled?: boolean;
}

const DEFAULTS: AppSettings = {
  uiDensity: "comfortable",
  posterSize: "md",
  reduceMotion: false,
  autoplayNext: true,
  skipIntro: true,
  defaultSpeed: 1.0,
  hwAccel: true,
  bufferProfile: "auto",
  subtitleEnabled: true,
  subtitleLang: "por",
  subtitleSize: "md",
  subtitleColor: "#FFFFFF",
  subtitleBg: true,
  audioLang: "por",
  parentalControl: false,
  maxRating: "18",
  syncEnabled: false,
};

export function SettingsView() {
  const profile = useAppStore((s) => s.profile);
  const profileId = profile?.id ?? "";
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<AppSettings>({
    queryKey: ["settings", profileId],
    queryFn: async () => {
      const r = await fetch(`/api/settings?profileId=${profileId}`);
      const j = await r.json();
      return (j.settings as AppSettings) || DEFAULTS;
    },
    enabled: !!profileId,
    staleTime: 30_000,
  });

  const settings: AppSettings = useMemo(
    () => ({ ...DEFAULTS, ...(settingsQuery.data || {}) }),
    [settingsQuery.data],
  );

  // Local working copy for inputs (PIN, etc.)
  const [pinDraft, setPinDraft] = useState("");

  const patchMutation = useMutation({
    mutationFn: async (patch: Partial<AppSettings>) => {
      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, ...patch }),
      });
      if (!r.ok) throw new Error("Falha ao salvar configurações.");
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["settings", profileId], data.settings);
    },
    onError: () => {
      toast("Não foi possível salvar. Tente novamente.");
    },
  });

  // Debounced patch helper
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = (patch: Partial<AppSettings>, label?: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patchMutation.mutate(patch);
      if (label) toast(`${label} atualizado.`);
    }, 400);
  };

  const set = (patch: Partial<AppSettings>, label?: string) => {
    // Optimistic local update for instant feedback
    queryClient.setQueryData<AppSettings>(["settings", profileId], (old) => ({
      ...DEFAULTS,
      ...(old || {}),
      ...patch,
    }));
    scheduleSave(patch, label);
  };

  const loading = settingsQuery.isLoading;

  return (
    <div className="min-h-screen px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-4 mb-8"
      >
        <div className="w-12 h-12 rounded-xl glass-card grid place-items-center">
          <SettingsIcon className="w-6 h-6 text-brand" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Ajustes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Personalize a aparência, reprodução, legendas e mais.
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList
            className="glass-card border border-white/10 h-auto flex-wrap justify-start gap-1 p-1.5 mb-6"
          >
            <TabsTrigger value="appearance" data-focusable className="gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Aparência
            </TabsTrigger>
            <TabsTrigger value="playback" data-focusable className="gap-1.5">
              <Play className="w-3.5 h-3.5" /> Reprodução
            </TabsTrigger>
            <TabsTrigger value="subtitles" data-focusable className="gap-1.5">
              <Subtitles className="w-3.5 h-3.5" /> Legendas
            </TabsTrigger>
            <TabsTrigger value="audio" data-focusable className="gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Áudio
            </TabsTrigger>
            <TabsTrigger value="parental" data-focusable className="gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Parental
            </TabsTrigger>
            <TabsTrigger value="sync" data-focusable className="gap-1.5">
              <Cloud className="w-3.5 h-3.5" /> Sync
            </TabsTrigger>
            <TabsTrigger value="privacy" data-focusable className="gap-1.5">
              <Database className="w-3.5 h-3.5" /> Privacidade
            </TabsTrigger>
            <TabsTrigger value="about" data-focusable className="gap-1.5">
              <Info className="w-3.5 h-3.5" /> Sobre
            </TabsTrigger>
          </TabsList>

          {/* Appearance */}
          <TabsContent value="appearance" className="space-y-4 mt-0">
            <SettingsCard
              title="Aparência"
              icon={<Palette className="w-4 h-4" />}
            >
              <SettingRow label="Tamanho dos posters" hint="Ajusta o tamanho dos cartões no catálogo.">
                <Segmented
                  value={settings.posterSize ?? "md"}
                  options={[
                    { value: "sm", label: "Pequeno" },
                    { value: "md", label: "Médio" },
                    { value: "lg", label: "Grande" },
                  ]}
                  onChange={(v) =>
                    set({ posterSize: v as AppSettings["posterSize"] }, "Tamanho dos posters")
                  }
                />
              </SettingRow>
              <Separator />
              <SettingRow
                label="Densidade da interface"
                hint="Espaçamento entre os elementos."
              >
                <Segmented
                  value={settings.uiDensity ?? "comfortable"}
                  options={[
                    { value: "compact", label: "Compacta" },
                    { value: "comfortable", label: "Confortável" },
                    { value: "expanded", label: "Expandida" },
                  ]}
                  onChange={(v) =>
                    set({ uiDensity: v as AppSettings["uiDensity"] }, "Densidade")
                  }
                />
              </SettingRow>
              <Separator />
              <SettingRow
                label="Reduzir animações"
                hint="Desativa transições pesadas para melhor performance."
              >
                <Switch
                  data-focusable
                  checked={!!settings.reduceMotion}
                  onCheckedChange={(c) =>
                    set({ reduceMotion: c }, "Reduzir animações")
                  }
                />
              </SettingRow>
            </SettingsCard>
          </TabsContent>

          {/* Playback */}
          <TabsContent value="playback" className="space-y-4 mt-0">
            <SettingsCard title="Reprodução" icon={<Play className="w-4 h-4" />}>
              <SettingRow
                label="Autoplay do próximo episódio"
                hint="Inicia automaticamente o próximo episódio da série."
              >
                <Switch
                  data-focusable
                  checked={!!settings.autoplayNext}
                  onCheckedChange={(c) =>
                    set({ autoplayNext: c }, "Autoplay")
                  }
                />
              </SettingRow>
              <Separator />
              <SettingRow
                label="Pular abertura"
                hint="Exibe um botão para pular a abertura quando detectada."
              >
                <Switch
                  data-focusable
                  checked={!!settings.skipIntro}
                  onCheckedChange={(c) =>
                    set({ skipIntro: c }, "Pular abertura")
                  }
                />
              </SettingRow>
              <Separator />
              <SettingRow label="Velocidade padrão" hint="Velocidade inicial do player.">
                <Select
                  value={String(settings.defaultSpeed ?? 1)}
                  onValueChange={(v) =>
                    set({ defaultSpeed: parseFloat(v) }, "Velocidade padrão")
                  }
                >
                  <SelectTrigger data-focusable className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s.toFixed(2)}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>
              <Separator />
              <SettingRow
                label="Aceleração de hardware"
                hint="Usa GPU para decodificação quando disponível."
              >
                <Switch
                  data-focusable
                  checked={!!settings.hwAccel}
                  onCheckedChange={(c) =>
                    set({ hwAccel: c }, "Aceleração de hardware")
                  }
                />
              </SettingRow>
              <Separator />
              <SettingRow label="Perfil de buffer" hint="Equilíbrio entre estabilidade e velocidade.">
                <Select
                  value={settings.bufferProfile ?? "auto"}
                  onValueChange={(v) =>
                    set({ bufferProfile: v as AppSettings["bufferProfile"] }, "Perfil de buffer")
                  }
                >
                  <SelectTrigger data-focusable className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixo</SelectItem>
                    <SelectItem value="auto">Automático</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </SettingsCard>
          </TabsContent>

          {/* Subtitles */}
          <TabsContent value="subtitles" className="space-y-4 mt-0">
            <SettingsCard title="Legendas" icon={<Subtitles className="w-4 h-4" />}>
              <SettingRow label="Habilitar legendas" hint="Exibe legendas quando disponíveis.">
                <Switch
                  data-focusable
                  checked={!!settings.subtitleEnabled}
                  onCheckedChange={(c) =>
                    set({ subtitleEnabled: c }, "Legendas")
                  }
                />
              </SettingRow>
              <Separator />
              <SettingRow label="Idioma preferido" hint="Idioma padrão das legendas.">
                <Select
                  value={settings.subtitleLang ?? "por"}
                  onValueChange={(v) =>
                    set({ subtitleLang: v as AppSettings["subtitleLang"] }, "Idioma das legendas")
                  }
                >
                  <SelectTrigger data-focusable className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="por">Português</SelectItem>
                    <SelectItem value="eng">Inglês</SelectItem>
                    <SelectItem value="spa">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <Separator />
              <SettingRow label="Tamanho" hint="Tamanho da fonte das legendas.">
                <Segmented
                  value={settings.subtitleSize ?? "md"}
                  options={[
                    { value: "sm", label: "P" },
                    { value: "md", label: "M" },
                    { value: "lg", label: "G" },
                    { value: "xl", label: "GG" },
                  ]}
                  onChange={(v) =>
                    set({ subtitleSize: v as AppSettings["subtitleSize"] }, "Tamanho das legendas")
                  }
                />
              </SettingRow>
              <Separator />
              <SettingRow label="Cor do texto" hint="Cor da fonte das legendas.">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    data-focusable
                    value={settings.subtitleColor ?? "#FFFFFF"}
                    onChange={(e) =>
                      set({ subtitleColor: e.target.value }, "Cor das legendas")
                    }
                    className="w-10 h-9 rounded-md border border-white/10 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-muted-foreground">
                    {settings.subtitleColor ?? "#FFFFFF"}
                  </span>
                </div>
              </SettingRow>
              <Separator />
              <SettingRow label="Fundo das legendas" hint="Adiciona um fundo escuro atrás do texto.">
                <Switch
                  data-focusable
                  checked={!!settings.subtitleBg}
                  onCheckedChange={(c) =>
                    set({ subtitleBg: c }, "Fundo das legendas")
                  }
                />
              </SettingRow>
            </SettingsCard>
          </TabsContent>

          {/* Audio */}
          <TabsContent value="audio" className="space-y-4 mt-0">
            <SettingsCard title="Áudio" icon={<Volume2 className="w-4 h-4" />}>
              <SettingRow label="Idioma preferido" hint="Faixa de áudio padrão quando disponível.">
                <Select
                  value={settings.audioLang ?? "por"}
                  onValueChange={(v) =>
                    set({ audioLang: v as AppSettings["audioLang"] }, "Idioma do áudio")
                  }
                >
                  <SelectTrigger data-focusable className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="por">Português</SelectItem>
                    <SelectItem value="eng">Inglês</SelectItem>
                    <SelectItem value="spa">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </SettingsCard>
          </TabsContent>

          {/* Parental */}
          <TabsContent value="parental" className="space-y-4 mt-0">
            <SettingsCard
              title="Controle Parental"
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              <SettingRow
                label="Ativar controle parental"
                hint="Oculta títulos acima da classificação máxima."
              >
                <Switch
                  data-focusable
                  checked={!!settings.parentalControl}
                  onCheckedChange={(c) =>
                    set({ parentalControl: c }, "Controle parental")
                  }
                />
              </SettingRow>
              <Separator />
              <SettingRow label="Classificação máxima" hint="Limita o conteúdo exibido.">
                <Select
                  value={settings.maxRating ?? "18"}
                  onValueChange={(v) =>
                    set({ maxRating: v }, "Classificação máxima")
                  }
                >
                  <SelectTrigger data-focusable className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">L — Livre</SelectItem>
                    <SelectItem value="10">A10</SelectItem>
                    <SelectItem value="12">A12</SelectItem>
                    <SelectItem value="14">A14</SelectItem>
                    <SelectItem value="16">A16</SelectItem>
                    <SelectItem value="18">A18</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <Separator />
              <SettingRow
                label="PIN de acesso"
                hint="Bloqueia títulos restritos até a inserção do PIN."
              >
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (pinDraft.length < 4) {
                      toast("O PIN deve ter pelo menos 4 dígitos.");
                      return;
                    }
                    fetch("/api/profiles", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: profileId, pin: pinDraft }),
                    })
                      .then(() => {
                        toast("PIN atualizado.");
                        setPinDraft("");
                        queryClient.invalidateQueries({ queryKey: ["profiles"] });
                      })
                      .catch(() => toast("Falha ao salvar PIN."));
                  }}
                >
                  <Input
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    value={pinDraft}
                    onChange={(e) =>
                      setPinDraft(e.target.value.replace(/\D/g, "").slice(0, 8))
                    }
                    className="w-24"
                    data-focusable
                  />
                  <Button type="submit" size="sm" data-focusable>
                    <Save className="w-3.5 h-3.5" /> Salvar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-focusable
                    onClick={() => {
                      fetch("/api/profiles", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: profileId, clearPin: true }),
                      })
                        .then(() => {
                          toast("PIN removido.");
                          queryClient.invalidateQueries({ queryKey: ["profiles"] });
                        })
                        .catch(() => toast("Falha ao remover PIN."));
                    }}
                  >
                    Limpar
                  </Button>
                </form>
              </SettingRow>
            </SettingsCard>
          </TabsContent>

          {/* Sync */}
          <TabsContent value="sync" className="space-y-4 mt-0">
            <SettingsCard
              title="Sincronização"
              icon={<Cloud className="w-4 h-4" />}
            >
              <SettingRow
                label="Sincronizar entre dispositivos"
                hint="Mantenha favoritos, progresso e ajustes em todos os seus dispositivos. (Em breve)"
              >
                <Switch
                  data-focusable
                  checked={!!settings.syncEnabled}
                  onCheckedChange={(c) =>
                    set({ syncEnabled: c }, "Sincronização entre dispositivos")
                  }
                />
              </SettingRow>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="border-brand/40 text-brand">
                  Em breve
                </Badge>
                <span>Disponível na próxima atualização.</span>
              </div>
            </SettingsCard>
          </TabsContent>

          {/* Privacy */}
          <TabsContent value="privacy" className="space-y-4 mt-0">
            <SettingsCard
              title="Privacidade"
              icon={<Database className="w-4 h-4" />}
            >
              <div className="flex flex-col gap-3">
                <PrivacyButton
                  icon={<Trash2 className="w-4 h-4" />}
                  title="Limpar histórico"
                  subtitle="Apaga todo o histórico de visualização deste perfil."
                  confirmTitle="Limpar histórico?"
                  confirmDescription="Todos os registros de visualização serão removidos. Esta ação não pode ser desfeita."
                  onConfirm={async () => {
                    try {
                      await fetch(`/api/history?profileId=${profileId}`, {
                        method: "DELETE",
                      });
                      queryClient.invalidateQueries({ queryKey: ["history", profileId] });
                      queryClient.invalidateQueries({
                        queryKey: ["history-continue", profileId],
                      });
                      toast("Histórico limpo.");
                    } catch {
                      toast("Falha ao limpar histórico.");
                    }
                  }}
                />
                <PrivacyButton
                  icon={<Database className="w-4 h-4" />}
                  title="Limpar cache"
                  subtitle="Libera espaço removendo imagens e arquivos temporários."
                  confirmTitle="Limpar cache?"
                  confirmDescription="Imagens em cache serão recarregadas na próxima visita. Não afeta favoritos nem histórico."
                  onConfirm={() => {
                    if (typeof caches !== "undefined") {
                      caches.keys().then((keys) =>
                        keys.forEach((k) => caches.delete(k)),
                      );
                    }
                    toast("Cache limpo.");
                  }}
                />
                <PrivacyButton
                  icon={<Heart className="w-4 h-4" />}
                  title="Apagar favoritos"
                  subtitle="Remove todos os favoritos deste perfil."
                  confirmTitle="Apagar favoritos?"
                  confirmDescription="Todos os favoritos serão removidos. Esta ação não pode ser desfeita."
                  onConfirm={async () => {
                    const favs = queryClient.getQueryData<any[]>([
                      "favorites",
                      profileId,
                    ]);
                    if (!favs || favs.length === 0) {
                      toast("Sem favoritos para apagar.");
                      return;
                    }
                    try {
                      await Promise.all(
                        favs.map((f) =>
                          fetch(
                            `/api/favorites?profileId=${profileId}&itemType=${f.itemType}&itemId=${f.itemId}`,
                            { method: "DELETE" },
                          ),
                        ),
                      );
                      queryClient.setQueryData(["favorites", profileId], []);
                      toast("Favoritos apagados.");
                    } catch {
                      toast("Falha ao apagar favoritos.");
                    }
                  }}
                />
              </div>
            </SettingsCard>
          </TabsContent>

          {/* About */}
          <TabsContent value="about" className="space-y-4 mt-0">
            <SettingsCard title="Sobre" icon={<Info className="w-4 h-4" />}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl glass-card grid place-items-center text-brand">
                  <Server className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-lg font-bold tracking-tight">
                    <span className="text-brand-gradient">ORANGE</span>{" "}
                    <span className="text-foreground font-light">Player</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Versão 1.0.0 · Orange Glass UI
                  </div>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <Para>
                  Plataforma de mídia multi-fonte com reprodução confiável,
                  navegação TV-first e identidade Orange Glass.
                </Para>
                <a
                  href="https://orangeplayer.example/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-focusable
                  className="inline-flex items-center gap-1.5 text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite rounded"
                >
                  Documentação
                  <Info className="w-3.5 h-3.5" />
                </a>
              </div>
            </SettingsCard>
          </TabsContent>
        </Tabs>
      )}

      {/* Save indicator */}
      {patchMutation.isPending && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50 glass-strong rounded-full px-4 py-2 flex items-center gap-2 text-sm border border-brand/30"
        >
          <Loader2 className="w-4 h-4 animate-spin text-brand" />
          Salvando...
        </motion.div>
      )}
      {patchMutation.isSuccess && !patchMutation.isPending && (
        <SaveTick />
      )}
    </div>
  );
}

function SaveTick() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="fixed bottom-6 right-6 z-50 glass-strong rounded-full px-4 py-2 flex items-center gap-2 text-sm border border-brand/30 text-brand"
    >
      <Check className="w-4 h-4" />
      Salvo
    </motion.div>
  );
}

function SettingsCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card rounded-2xl p-5 md:p-6"
    >
      <header className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg glass grid place-items-center text-brand">
          {icon}
        </div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      </header>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-1">
      <div className="min-w-0">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {hint && (
          <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-lg glass border border-white/10">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            data-focusable
            onClick={() => onChange(o.value)}
            className={cn(
              "px-3 h-8 rounded-md text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
              active
                ? "bg-brand text-graphite shadow-[0_4px_12px_-4px_rgba(255,120,31,0.55)]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function PrivacyButton({
  icon,
  title,
  subtitle,
  confirmTitle,
  confirmDescription,
  onConfirm,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  confirmTitle: string;
  confirmDescription: string;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg glass grid place-items-center text-muted-foreground shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {title}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {subtitle}
          </div>
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            data-focusable
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            Executar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="glass-strong border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-focusable>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-focusable
              onClick={() => onConfirm()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
