"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSpatialNav } from "@/hooks/use-spatial-nav";
import { Splash } from "@/components/orange/splash";
import { OnboardingView } from "@/components/orange/onboarding/onboarding-view";
import { ProfileSelect } from "@/components/orange/onboarding/profile-select";
import { AuroraDashboard } from "@/components/orange/home/aurora-dashboard";
import { MoviesView } from "@/components/orange/movies/movies-view";
import { MovieDetail } from "@/components/orange/movies/movie-detail";
import { SeriesView } from "@/components/orange/series/series-view";
import { SeriesDetail } from "@/components/orange/series/series-detail";
import { LiveView } from "@/components/orange/live/live-view";
import { SearchView } from "@/components/orange/search/search-view";
import { FavoritesView } from "@/components/orange/favorites/favorites-view";
import { HistoryView } from "@/components/orange/history/history-view";
import { SettingsView } from "@/components/orange/settings/settings-view";
import { ProfilesView } from "@/components/orange/profiles/profiles-view";
import { ProvidersView } from "@/components/orange/providers/providers-view";
import { PlayerOverlay } from "@/components/orange/player/player-overlay";
import { Sidebar } from "@/components/orange/home/sidebar";
import { toast } from "sonner";

const MAIN_VIEWS = [
  "home",
  "movies",
  "series",
  "live",
  "search",
  "favorites",
  "history",
  "settings",
  "profiles",
  "providers",
  "movie-detail",
  "series-detail",
];

export default function Home() {
  useSpatialNav();
  const { view, playerItem, profile } = useAppStore();
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  // Toast listener (do app store)
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail as string;
      toast(msg);
    };
    window.addEventListener("orange-toast", handler);
    return () => window.removeEventListener("orange-toast", handler);
  }, []);

  // Boot: carregar perfis/providers (sem seed automático de demo)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Profiles & providers
        const [profilesRes, providersRes] = await Promise.all([
          fetch("/api/profiles").then((r) => r.json()),
          fetch("/api/providers").then((r) => r.json()),
        ]);
        if (cancelled) return;

        useAppStore.getState().setProviders(providersRes.providers || []);

        if (profilesRes.profiles && profilesRes.profiles.length > 0) {
          // Já existe perfil → ir para seleção de perfil
          useAppStore.getState().setView("profile-select");
        } else {
          // Sem perfil → onboarding completo
          useAppStore.getState().setView("onboarding");
        }
        // pequeno delay para a splash ter efeito
        setTimeout(() => !cancelled && setBooted(true), 2200);
      } catch (err) {
        console.error("boot erro:", err);
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : "Erro de inicialização.");
          setBooted(true);
          useAppStore.getState().setView("onboarding");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sempre que view mudar para um detalhe, scroll top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const isMainView = MAIN_VIEWS.includes(view);

  if (!booted) {
    return <Splash bootError={bootError} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-1 min-h-0">
        {isMainView && profile && <Sidebar />}
        <main className="flex-1 min-h-0 min-w-0 relative">
          {view === "onboarding" && <OnboardingView />}
          {view === "profile-select" && <ProfileSelect />}
          {view === "home" && <AuroraDashboard />}
          {view === "movies" && <MoviesView />}
          {view === "movie-detail" && <MovieDetail />}
          {view === "series" && <SeriesView />}
          {view === "series-detail" && <SeriesDetail />}
          {view === "live" && <LiveView />}
          {view === "search" && <SearchView />}
          {view === "favorites" && <FavoritesView />}
          {view === "history" && <HistoryView />}
          {view === "settings" && <SettingsView />}
          {view === "profiles" && <ProfilesView />}
          {view === "providers" && <ProvidersView />}
        </main>
      </div>
      {playerItem && <PlayerOverlay />}
    </div>
  );
}
