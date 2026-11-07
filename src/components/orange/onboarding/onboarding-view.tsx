"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Server,
  FileText,
  Zap,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { OrangeButton } from "@/components/orange/orange-button";
import { useAppStore } from "@/stores/app-store";
import { useKeyHandler } from "@/hooks/use-spatial-nav";
import { cn } from "@/lib/utils";
import type {
  ProviderType,
  CreateProviderInput,
  ProviderDTO,
  ProfileDTO,
} from "@/types";

// ============================================================
// Onboarding — fluxo de boas-vindas + cadastro de fonte + perfil
// ============================================================

type Step =
  | "welcome"
  | "choose-provider"
  | "xtream-form"
  | "m3u-form"
  | "syncing"
  | "profile-create";

interface TestResult {
  status: "idle" | "testing" | "ok" | "error";
  info?: string;
  error?: string;
}

interface FormState {
  name: string;
  serverUrl: string;
  username: string;
  password: string;
  m3uUrl: string;
}

interface FormErrors {
  name?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
  m3uUrl?: string;
}

const emptyForm: FormState = {
  name: "",
  serverUrl: "",
  username: "",
  password: "",
  m3uUrl: "",
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

const inputClass = cn(
  "h-12 w-full rounded-xl bg-graphite/70 border border-white/10 px-4 text-foreground",
  "placeholder:text-muted-foreground/70 transition-all duration-200",
  "focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
  "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
);

const labelClass = "block text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium";

export function OnboardingView() {
  const [step, setStep] = useState<Step>("welcome");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [testResult, setTestResult] = useState<TestResult>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string>("Conectando ao servidor…");
  const [pendingType, setPendingType] = useState<ProviderType | null>(null);
  const [createdProvider, setCreatedProvider] = useState<ProviderDTO | null>(null);
  const [profilesExist, setProfilesExist] = useState(false);

  const setProfile = useAppStore((s) => s.setProfile);
  const setProviders = useAppStore((s) => s.setProviders);
  const pushView = useAppStore((s) => s.pushView);
  const providers = useAppStore((s) => s.providers);

  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Back key handling: Escape or Backspace returns to previous step (when applicable)
  useKeyHandler((e) => {
    if (e.key === "Escape" || e.key === "Backspace") {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (step) {
        case "welcome":
          return;
        case "choose-provider":
          setStep("welcome");
          break;
        case "xtream-form":
        case "m3u-form":
          setStep("choose-provider");
          break;
        case "profile-create":
          setStep("choose-provider");
          break;
      }
    }
  }, [step]);

  // Focus first input on form steps
  useEffect(() => {
    if (step === "xtream-form" || step === "m3u-form" || step === "profile-create") {
      const t = setTimeout(() => firstInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Animate sync progress while syncing
  useEffect(() => {
    if (step !== "syncing") return;
    setSyncProgress(0);
    setSyncStatus("Conectando ao servidor…");
    const interval = setInterval(() => {
      setSyncProgress((p) => {
        if (p >= 92) return p;
        const next = p + Math.random() * 11;
        if (next < 25) setSyncStatus("Conectando ao servidor…");
        else if (next < 55) setSyncStatus("Baixando catálogo…");
        else if (next < 80) setSyncStatus("Organizando filmes e séries…");
        else setSyncStatus("Finalizando…");
        return next;
      });
    }, 320);
    return () => clearInterval(interval);
  }, [step]);

  // ----- Handlers -----

  function validateXtream(): FormErrors {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Informe um nome amigável.";
    if (!form.serverUrl.trim()) e.serverUrl = "Informe a URL do servidor.";
    else if (!/^https?:\/\//i.test(form.serverUrl.trim()))
      e.serverUrl = "A URL deve começar com http:// ou https://";
    if (!form.username.trim()) e.username = "Informe o usuário.";
    if (!form.password) e.password = "Informe a senha.";
    return e;
  }

  function validateM3U(): FormErrors {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Informe um nome amigável.";
    if (!form.m3uUrl.trim()) e.m3uUrl = "Informe a URL da lista M3U.";
    else if (!/^https?:\/\//i.test(form.m3uUrl.trim()))
      e.m3uUrl = "A URL deve começar com http:// ou https://";
    return e;
  }

  async function runTest(type: "xtream" | "m3u") {
    const e = type === "xtream" ? validateXtream() : validateM3U();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Corrija os campos destacados.");
      return;
    }
    setTestResult({ status: "testing" });
    try {
      const body =
        type === "xtream"
          ? {
              type,
              serverUrl: form.serverUrl.trim(),
              username: form.username.trim(),
              password: form.password,
            }
          : { type, m3uUrl: form.m3uUrl.trim() };
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setTestResult({ status: "error", error: data.error || "Falha ao conectar." });
        toast.error(data.error || "Falha ao conectar.");
      } else {
        setTestResult({
          status: "ok",
          info: data.info || (data.itemCount ? `${data.itemCount} itens detectados` : "Conexão bem-sucedida"),
        });
        toast.success("Conexão testada com sucesso!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de rede ao testar.";
      setTestResult({ status: "error", error: msg });
      toast.error(msg);
    }
  }

  async function saveAndSync(type: "xtream" | "m3u") {
    const e = type === "xtream" ? validateXtream() : validateM3U();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Corrija os campos destacados.");
      return;
    }
    setSaving(true);
    try {
      // 1. Create provider
      const body: CreateProviderInput =
        type === "xtream"
          ? {
              name: form.name.trim(),
              type: "xtream",
              serverUrl: form.serverUrl.trim(),
              username: form.username.trim(),
              password: form.password,
            }
          : {
              name: form.name.trim(),
              type: "m3u",
              m3uUrl: form.m3uUrl.trim(),
            };

      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.provider) {
        throw new Error(data.error || "Erro ao salvar provedor.");
      }
      const provider = data.provider as ProviderDTO;
      setCreatedProvider(provider);
      setProviders([...providers, provider]);

      // 2. Sync (with animated progress)
      setStep("syncing");
      setSaving(false);

      const syncRes = await fetch(`/api/providers/${provider.id}/sync`, {
        method: "POST",
      });
      const syncData = await syncRes.json();
      setSyncProgress(100);
      setSyncStatus(syncData.ok ? `Concluído · ${syncData.itemCount} itens` : "Concluído");

      if (!syncRes.ok || syncData.error) {
        toast.error(syncData.error || "Falha na sincronização. Você pode tentar novamente em Fontes.");
      } else {
        toast.success(`Sincronizado: ${syncData.itemCount} itens.`);
      }

      // 3. Refresh providers in store
      try {
        const refreshed = await fetch("/api/providers").then((r) => r.json());
        if (refreshed.providers) setProviders(refreshed.providers);
      } catch {
        /* noop */
      }

      // 4. Check profiles
      const profilesRes = await fetch("/api/profiles").then((r) => r.json());
      const profiles: ProfileDTO[] = profilesRes.profiles ?? [];
      setProfilesExist(profiles.length > 0);

      // 5. Continue
      setTimeout(() => {
        if (profiles.length > 0) {
          setProfile(profiles[0]);
          pushView("home");
        } else {
          setStep("profile-create");
        }
      }, 900);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
    }
  }

  async function finishProfileCreate(name: string) {
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Erro ao criar perfil.");
      }
      setProfile(data.profile as ProfileDTO);
      toast.success("Perfil criado!");
      pushView("home");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar perfil.");
    }
  }

  // ----- Render -----

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 bg-radial-brand" />
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-1/4 -left-1/4 w-[55vw] h-[55vw] rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[45vw] h-[45vw] rounded-full bg-brand/8 blur-[100px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-vignette" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10 md:py-16">
        <AnimatePresence mode="wait">
          {/* ============== Welcome ============== */}
          {step === "welcome" && (
            <motion.div key="welcome" {...fadeUp} className="w-full max-w-2xl text-center">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto mb-8"
              >
                <Logo size={120} />
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                <span className="text-brand-gradient">ORANGE</span>
                <span className="text-foreground ml-3 font-light">Player</span>
              </h1>
              <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Entre no seu universo. Filmes, séries, canais e entretenimento em uma
                experiência única.
              </p>
              <div className="mt-10">
                <OrangeButton
                  size="xl"
                  icon={<Sparkles className="w-5 h-5" />}
                  onClick={() => setStep("choose-provider")}
                >
                  Iniciar
                </OrangeButton>
              </div>
              <p className="mt-6 text-xs text-muted-foreground/60 tracking-widest uppercase">
                Orange Glass UI · v1.0
              </p>
            </motion.div>
          )}

          {/* ============== Choose Provider ============== */}
          {step === "choose-provider" && (
            <motion.div key="choose-provider" {...fadeUp} className="w-full max-w-3xl">
              <header className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Escolha sua <span className="text-brand-gradient">fonte</span>
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Conecte seu provedor IPTV para começar a assistir.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <ProviderCard
                  icon={<Server className="w-7 h-7" />}
                  title="Xtream Codes"
                  description="Conecte sua conta Xtream Codes com URL do servidor, usuário e senha."
                  badge="Recomendado"
                  onClick={() => {
                    setErrors({});
                    setTestResult({ status: "idle" });
                    setForm(emptyForm);
                    setStep("xtream-form");
                  }}
                />
                <ProviderCard
                  icon={<FileText className="w-7 h-7" />}
                  title="Lista M3U / M3U8"
                  description="Importe uma playlist M3U a partir de uma URL pública ou privada."
                  onClick={() => {
                    setErrors({});
                    setTestResult({ status: "idle" });
                    setForm(emptyForm);
                    setStep("m3u-form");
                  }}
                />
              </div>

              <div className="mt-8 text-center">
                <OrangeButton
                  variant="ghost"
                  size="md"
                  icon={<ArrowLeft className="w-4 h-4" />}
                  onClick={() => setStep("welcome")}
                >
                  Voltar
                </OrangeButton>
              </div>
            </motion.div>
          )}

          {/* ============== Xtream Form ============== */}
          {step === "xtream-form" && (
            <motion.div key="xtream-form" {...fadeUp} className="w-full max-w-2xl">
              <FormShell
                title="Login Xtream Codes"
                subtitle="Conecte seu provedor Xtream Codes."
                onBack={() => setStep("choose-provider")}
              >
                <form
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    saveAndSync("xtream");
                  }}
                  className="space-y-4"
                >
                  <Field
                    label="Nome amigável"
                    error={errors.name}
                    input={
                      <input
                        ref={firstInputRef}
                        type="text"
                        className={inputClass}
                        placeholder="Ex.: Meu Xtream"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        aria-invalid={!!errors.name}
                      />
                    }
                  />
                  <Field
                    label="URL do servidor"
                    error={errors.serverUrl}
                    input={
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="http://seuservidor.com:8080"
                        value={form.serverUrl}
                        onChange={(e) => setForm({ ...form, serverUrl: e.target.value })}
                        aria-invalid={!!errors.serverUrl}
                      />
                    }
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field
                      label="Usuário"
                      error={errors.username}
                      input={
                        <input
                          type="text"
                          className={inputClass}
                          autoComplete="username"
                          placeholder="usuário"
                          value={form.username}
                          onChange={(e) => setForm({ ...form, username: e.target.value })}
                          aria-invalid={!!errors.username}
                        />
                      }
                    />
                    <Field
                      label="Senha"
                      error={errors.password}
                      input={
                        <input
                          type="password"
                          className={inputClass}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          aria-invalid={!!errors.password}
                        />
                      }
                    />
                  </div>

                  <TestResultAlert result={testResult} />

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <OrangeButton
                      type="submit"
                      size="lg"
                      icon={<Zap className="w-4 h-4" />}
                      disabled={saving}
                    >
                      {saving ? "Salvando…" : "Salvar e Sincronizar"}
                    </OrangeButton>
                    <OrangeButton
                      type="button"
                      variant="glass"
                      size="lg"
                      icon={
                        testResult.status === "testing" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )
                      }
                      disabled={testResult.status === "testing" || saving}
                      onClick={() => runTest("xtream")}
                    >
                      {testResult.status === "testing" ? "Testando…" : "Testar Conexão"}
                    </OrangeButton>
                    <OrangeButton
                      type="button"
                      variant="ghost"
                      size="lg"
                      icon={<ArrowLeft className="w-4 h-4" />}
                      onClick={() => setStep("choose-provider")}
                    >
                      Voltar
                    </OrangeButton>
                  </div>
                </form>
              </FormShell>
            </motion.div>
          )}

          {/* ============== M3U Form ============== */}
          {step === "m3u-form" && (
            <motion.div key="m3u-form" {...fadeUp} className="w-full max-w-2xl">
              <FormShell
                title="Importar Lista M3U"
                subtitle="Cole a URL da sua playlist M3U/M3U8."
                onBack={() => setStep("choose-provider")}
              >
                <form
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    saveAndSync("m3u");
                  }}
                  className="space-y-4"
                >
                  <Field
                    label="Nome amigável"
                    error={errors.name}
                    input={
                      <input
                        ref={firstInputRef}
                        type="text"
                        className={inputClass}
                        placeholder="Ex.: Minha Lista"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        aria-invalid={!!errors.name}
                      />
                    }
                  />
                  <Field
                    label="URL da lista M3U"
                    error={errors.m3uUrl}
                    input={
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="https://exemplo.com/playlist.m3u8"
                        value={form.m3uUrl}
                        onChange={(e) => setForm({ ...form, m3uUrl: e.target.value })}
                        aria-invalid={!!errors.m3uUrl}
                      />
                    }
                  />

                  <TestResultAlert result={testResult} />

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <OrangeButton
                      type="submit"
                      size="lg"
                      icon={<ArrowRight className="w-4 h-4" />}
                      disabled={saving}
                    >
                      {saving ? "Salvando…" : "Salvar e Sincronizar"}
                    </OrangeButton>
                    <OrangeButton
                      type="button"
                      variant="glass"
                      size="lg"
                      icon={
                        testResult.status === "testing" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )
                      }
                      disabled={testResult.status === "testing" || saving}
                      onClick={() => runTest("m3u")}
                    >
                      {testResult.status === "testing" ? "Testando…" : "Testar Conexão"}
                    </OrangeButton>
                    <OrangeButton
                      type="button"
                      variant="ghost"
                      size="lg"
                      icon={<ArrowLeft className="w-4 h-4" />}
                      onClick={() => setStep("choose-provider")}
                    >
                      Voltar
                    </OrangeButton>
                  </div>
                </form>
              </FormShell>
            </motion.div>
          )}

          {/* ============== Syncing ============== */}
          {step === "syncing" && (
            <motion.div key="syncing" {...fadeUp} className="w-full max-w-xl text-center">
              <div className="glass-card rounded-3xl p-10 md:p-14">
                <div className="relative mx-auto mb-8 w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-brand/20 blur-2xl animate-pulse-brand" />
                  <div className="relative w-24 h-24 rounded-full glass grid place-items-center">
                    <Loader2 className="w-12 h-12 text-brand animate-spin" />
                  </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Sincronizando…</h2>
                <p className="mt-2 text-muted-foreground">{syncStatus}</p>
                {createdProvider && (
                  <p className="mt-1 text-xs text-muted-foreground/70 tracking-widest uppercase">
                    {createdProvider.name}
                  </p>
                )}

                <div className="mt-8 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-brand-light to-brand rounded-full"
                    animate={{ width: `${syncProgress}%` }}
                    transition={{ ease: "linear", duration: 0.3 }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Math.round(syncProgress)}%</span>
                  <span className="tracking-widest uppercase">Aguarde…</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============== Profile Create ============== */}
          {step === "profile-create" && (
            <motion.div key="profile-create" {...fadeUp} className="w-full max-w-2xl">
              <FormShell
                title="Crie seu perfil"
                subtitle="Dê um nome ao seu perfil para personalizar a experiência."
                onBack={() => setStep("choose-provider")}
              >
                <ProfileCreateForm
                  firstInputRef={firstInputRef}
                  onConcluir={finishProfileCreate}
                />
              </FormShell>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function Logo({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      className="drop-shadow-[0_0_40px_rgba(255,120,31,0.45)] mx-auto"
    >
      <defs>
        <linearGradient id="onb-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB45F" />
          <stop offset="0.5" stopColor="#FF781F" />
          <stop offset="1" stopColor="#E85D0F" />
        </linearGradient>
      </defs>
      <path
        d="M70 12 L120 40 L120 100 L70 128 L20 100 L20 40 Z"
        fill="none"
        stroke="url(#onb-lg)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="70" cy="70" r="22" fill="url(#onb-lg)" />
    </svg>
  );
}

function ProviderCard({
  icon,
  title,
  description,
  badge,
  onClick,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      data-focusable
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "group relative text-left glass-card rounded-2xl p-5 md:p-6 transition-all duration-300",
        "card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
        "disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {badge && (
        <span className="absolute top-3 right-3 text-[10px] uppercase tracking-widest text-brand bg-brand/15 border border-brand/30 rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
      <div className="w-12 h-12 rounded-xl glass grid place-items-center text-brand mb-4 group-hover:scale-110 transition-transform">
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
      <div className="mt-4 flex items-center gap-1.5 text-brand text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Selecionar <ArrowRight className="w-4 h-4" />
      </div>
    </button>
  );
}

function FormShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-3xl p-6 md:p-10 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]">
      <button
        data-focusable
        type="button"
        onClick={onBack}
        className={cn(
          "mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded",
        )}
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1.5 text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  error,
  input,
}: {
  label: string;
  error?: string;
  input: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {input}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 text-xs text-destructive flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function TestResultAlert({ result }: { result: TestResult }) {
  if (result.status === "idle") return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mt-2 rounded-xl px-4 py-3 text-sm flex items-start gap-2.5 border",
        result.status === "testing" &&
          "bg-brand/10 border-brand/30 text-brand",
        result.status === "ok" &&
          "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
        result.status === "error" &&
          "bg-destructive/10 border-destructive/30 text-destructive",
      )}
    >
      {result.status === "testing" && <Loader2 className="w-4 h-4 mt-0.5 animate-spin shrink-0" />}
      {result.status === "ok" && <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
      {result.status === "error" && <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        {result.status === "testing" && <span>Testando conexão…</span>}
        {result.status === "ok" && (
          <span>
            Conexão bem-sucedida.
            {result.info && <span className="text-muted-foreground ml-1">· {result.info}</span>}
          </span>
        )}
        {result.status === "error" && <span>{result.error || "Falha ao conectar."}</span>}
      </div>
    </motion.div>
  );
}

function ProfileCreateForm({
  firstInputRef,
  onConcluir,
}: {
  firstInputRef: React.RefObject<HTMLInputElement | null>;
  onConcluir: (name: string) => void;
}) {
  const [name, setName] = useState("Perfil Principal");
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe um nome para o perfil.");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    await onConcluir(name);
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Nome do perfil"
        error={error}
        input={
          <input
            ref={firstInputRef}
            type="text"
            className={inputClass}
            placeholder="Ex.: Perfil Principal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!error}
            maxLength={60}
          />
        }
      />

      <div className="flex items-center gap-3 pt-2">
        <OrangeButton
          type="submit"
          size="lg"
          icon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          disabled={submitting}
        >
          {submitting ? "Criando…" : "Concluir"}
        </OrangeButton>
        <OrangeButton
          type="button"
          variant="ghost"
          size="lg"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setName("")}
        >
          Limpar
        </OrangeButton>
      </div>
    </form>
  );
}
