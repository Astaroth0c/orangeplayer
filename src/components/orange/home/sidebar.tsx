"use client";

import {
  Home,
  Film,
  Tv,
  Search,
  Heart,
  History,
  Settings,
  Users,
  Clapperboard,
  LayoutGrid,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import type { ScreenView } from "@/types";

const NAV: Array<{ view: ScreenView; label: string; icon: any }> = [
  { view: "home", label: "Início", icon: Home },
  { view: "movies", label: "Filmes", icon: Film },
  { view: "series", label: "Séries", icon: Clapperboard },
  { view: "live", label: "TV ao Vivo", icon: Tv },
  { view: "search", label: "Busca", icon: Search },
];

const NAV_SECONDARY: Array<{ view: ScreenView; label: string; icon: any }> = [
  { view: "favorites", label: "Favoritos", icon: Heart },
  { view: "history", label: "Histórico", icon: History },
  { view: "providers", label: "Fontes", icon: LayoutGrid },
  { view: "profiles", label: "Perfis", icon: Users },
  { view: "settings", label: "Ajustes", icon: Settings },
];

export function Sidebar() {
  const { view, pushView, profile, providers } = useAppStore();
  const activeProvider = providers[0];

  const Item = ({
    item,
  }: {
    item: { view: ScreenView; label: string; icon: any };
  }) => {
    const Icon = item.icon;
    const active = view === item.view;
    return (
      <button
        data-focusable
        onClick={() => pushView(item.view)}
        className={cn(
          "w-full flex items-center gap-3 px-4 h-12 rounded-lg transition-all duration-200 group",
          "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
          active
            ? "bg-brand/15 text-brand border border-brand/30 brand-glow-soft"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent",
        )}
      >
        <Icon
          className={cn(
            "w-5 h-5 shrink-0 transition-transform",
            active ? "scale-110" : "group-hover:scale-105",
          )}
        />
        <span className="text-sm font-medium tracking-tight">{item.label}</span>
        {active && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_rgba(255,120,31,0.8)]" />
        )}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex w-64 shrink-0 glass-nav flex-col h-screen sticky top-0 z-30">
      <button
        onClick={() => pushView("home")}
        className="px-6 py-6 flex items-center gap-3 border-b border-white/5"
      >
        <div className="relative">
          <svg width="36" height="36" viewBox="0 0 140 140" className="drop-shadow-[0_0_12px_rgba(255,120,31,0.5)]">
            <defs>
              <linearGradient id="sb-lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFB45F" />
                <stop offset="0.5" stopColor="#FF781F" />
                <stop offset="1" stopColor="#E85D0F" />
              </linearGradient>
            </defs>
            <path
              d="M70 12 L120 40 L120 100 L70 128 L20 100 L20 40 Z"
              fill="none"
              stroke="url(#sb-lg)"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <circle cx="70" cy="70" r="16" fill="url(#sb-lg)" />
          </svg>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-lg font-extrabold">
            <span className="text-brand-gradient">ORANGE</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
            Player
          </span>
        </div>
      </button>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        <div className="px-3 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Navegação
        </div>
        {NAV.map((item) => (
          <Item key={item.view} item={item} />
        ))}

        <div className="px-3 mt-5 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Minha Área
        </div>
        {NAV_SECONDARY.map((item) => (
          <Item key={item.view} item={item} />
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/5">
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/40 grid place-items-center text-brand font-bold">
            {profile?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">
              {profile?.name ?? "Convidado"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {activeProvider
                ? `${activeProvider.type.toUpperCase()} · ${activeProvider.itemCount} itens`
                : "Sem fonte ativa"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
