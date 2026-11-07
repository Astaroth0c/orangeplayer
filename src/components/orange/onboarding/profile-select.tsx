"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Loader2, Baby, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { OrangeButton } from "@/components/orange/orange-button";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import type { ProfileDTO, ProviderDTO } from "@/types";

// ============================================================
// Profile Select — seleção de perfil (pós-splash)
// ============================================================

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

const AVATAR_GRADIENTS = [
  "from-orange-400 to-orange-700",
  "from-rose-400 to-rose-700",
  "from-violet-400 to-violet-700",
  "from-sky-400 to-sky-700",
  "from-emerald-400 to-emerald-700",
  "from-amber-400 to-amber-700",
];

function gradientFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

export function ProfileSelect() {
  const [profiles, setProfiles] = useState<ProfileDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [enteringId, setEnteringId] = useState<string | null>(null);

  const setProfile = useAppStore((s) => s.setProfile);
  const setProviders = useAppStore((s) => s.setProviders);
  const pushView = useAppStore((s) => s.pushView);

  async function fetchProfiles() {
    setLoading(true);
    try {
      const data = await fetch("/api/profiles").then((r) => r.json());
      setProfiles(data.profiles ?? []);
    } catch {
      toast.error("Erro ao carregar perfis.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function enterProfile(p: ProfileDTO) {
    setEnteringId(p.id);
    try {
      // Carrega providers associados ao estado global
      const providersRes = await fetch("/api/providers").then((r) => r.json());
      const providers: ProviderDTO[] = providersRes.providers ?? [];
      setProviders(providers);
      setProfile(p);
      toast.success(`Bem-vindo, ${p.name}!`);
      pushView("home");
    } catch {
      toast.error("Erro ao carregar fonte.");
      setEnteringId(null);
    }
  }

  async function createNewProfile() {
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Novo Perfil", isDefault: profiles.length === 0 }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Erro ao criar perfil.");
      }
      const created = data.profile as ProfileDTO;
      await fetchProfiles();
      toast.success("Perfil criado!");
      // Já entra direto no novo perfil
      setProfile(created);
      try {
        const providersRes = await fetch("/api/providers").then((r) => r.json());
        if (providersRes.providers) setProviders(providersRes.providers);
      } catch {
        /* noop */
      }
      pushView("home");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar perfil.");
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 bg-radial-brand" />
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-1/4 -left-1/4 w-[55vw] h-[55vw] rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[45vw] h-[45vw] rounded-full bg-brand/8 blur-[100px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-vignette" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10 md:py-16">
        <AnimatePresence mode="wait">
          <motion.div key="profile-select" {...fadeUp} className="w-full max-w-4xl">
            <header className="text-center mb-10">
              <div className="mx-auto mb-5 w-14 h-14 rounded-2xl glass grid place-items-center text-brand brand-glow-soft">
                <Users className="w-7 h-7" />
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                <span className="text-brand-gradient">Quem</span> está assistindo?
              </h1>
              <p className="mt-3 text-muted-foreground">
                Selecione um perfil para continuar.
              </p>
            </header>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando perfis…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
                  {profiles.map((p) => {
                    const grad = gradientFor(p.name);
                    const initial = (p.name?.[0] ?? "?").toUpperCase();
                    const isEntering = enteringId === p.id;
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="group"
                      >
                        <button
                          data-focusable
                          type="button"
                          onClick={() => enterProfile(p)}
                          disabled={isEntering}
                          className={cn(
                            "w-full rounded-2xl p-4 transition-all duration-300 text-center",
                            "glass-card border border-white/10 card-lift",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                            "focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
                            "hover:border-brand/50",
                            "disabled:opacity-60 disabled:cursor-not-allowed",
                          )}
                        >
                          <div className="relative mx-auto w-20 h-20 md:w-24 md:h-24 mb-3">
                            <div
                              className={cn(
                                "w-full h-full rounded-full grid place-items-center text-3xl font-extrabold text-white",
                                "bg-gradient-to-br shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6)]",
                                grad,
                              )}
                            >
                              {isEntering ? (
                                <Loader2 className="w-7 h-7 animate-spin" />
                              ) : (
                                initial
                              )}
                            </div>
                            {p.isDefault && (
                              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand text-graphite grid place-items-center text-xs font-bold border-2 border-graphite">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                            {p.isKid && (
                              <span className="absolute -top-1 -right-1 inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider bg-sky-500/80 text-white rounded-full px-1.5 py-0.5 border border-graphite">
                                <Baby className="w-2.5 h-2.5" /> Kid
                              </span>
                            )}
                          </div>
                          <div className="text-sm md:text-base font-semibold text-foreground truncate">
                            {p.name}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground tracking-wider uppercase">
                            Entrar
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}

                  {/* Criar novo perfil */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className="group"
                  >
                    <button
                      data-focusable
                      type="button"
                      onClick={createNewProfile}
                      className={cn(
                        "w-full rounded-2xl p-4 transition-all duration-300 text-center",
                        "border-2 border-dashed border-white/15 hover:border-brand/60",
                        "glass-card card-lift",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                        "focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
                      )}
                    >
                      <div className="mx-auto w-20 h-20 md:w-24 md:h-24 mb-3 rounded-full grid place-items-center bg-white/5 border border-white/10 text-brand group-hover:scale-110 transition-transform">
                        <Plus className="w-9 h-9" />
                      </div>
                      <div className="text-sm md:text-base font-semibold text-foreground">
                        Criar novo perfil
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground tracking-wider uppercase">
                        Adicionar
                      </div>
                    </button>
                  </motion.div>
                </div>

                {profiles.length === 0 && (
                  <p className="mt-8 text-center text-sm text-muted-foreground">
                    Nenhum perfil encontrado. Crie um para começar.
                  </p>
                )}

                {/* Optional onboarding entry (configure a new source) */}
                <div className="mt-10 flex items-center justify-center">
                  <OrangeButton
                    variant="ghost"
                    size="md"
                    icon={<ArrowLeft className="w-4 h-4" />}
                    onClick={() => pushView("onboarding")}
                  >
                    Configurar uma fonte
                  </OrangeButton>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
