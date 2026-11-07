// ===========================================================
// App Store — estado global do ORANGE Player
// ===========================================================

import { create } from "zustand";
import type {
  ScreenView,
  ProfileDTO,
  ProviderDTO,
  CatalogMovie,
  CatalogSeries,
  CatalogChannel,
  PlayerItem,
} from "@/types";

interface AppState {
  // Boot
  booted: boolean;
  setBooted: (v: boolean) => void;

  // Perfil ativo
  profile: ProfileDTO | null;
  setProfile: (p: ProfileDTO | null) => void;

  // Providers
  providers: ProviderDTO[];
  setProviders: (p: ProviderDTO[]) => void;

  // Navegação
  view: ScreenView;
  setView: (v: ScreenView) => void;
  // histórico de navegação para Voltar
  viewStack: ScreenView[];
  pushView: (v: ScreenView) => void;
  popView: () => void;

  // Detalhe selecionado
  selectedMovie: CatalogMovie | null;
  selectedSeries: CatalogSeries | null;
  selectedChannel: CatalogChannel | null;
  selectMovie: (m: CatalogMovie | null) => void;
  selectSeries: (s: CatalogSeries | null) => void;
  selectChannel: (c: CatalogChannel | null) => void;

  // Player
  playerItem: PlayerItem | null;
  openPlayer: (item: PlayerItem) => void;
  closePlayer: () => void;

  // Toast rápido
  toast: (msg: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  booted: false,
  setBooted: (v) => set({ booted: v }),

  profile: null,
  setProfile: (p) => set({ profile: p }),

  providers: [],
  setProviders: (p) => set({ providers: p }),

  view: "splash",
  setView: (v) => set({ view: v }),
  viewStack: ["splash"],
  pushView: (v) => set((s) => ({ view: v, viewStack: [...s.viewStack, v] })),
  popView: () =>
    set((s) => {
      if (s.viewStack.length <= 1) return {};
      const stack = s.viewStack.slice(0, -1);
      return { view: stack[stack.length - 1], viewStack: stack };
    }),

  selectedMovie: null,
  selectedSeries: null,
  selectedChannel: null,
  selectMovie: (m) => set({ selectedMovie: m }),
  selectSeries: (s) => set({ selectedSeries: s }),
  selectChannel: (c) => set({ selectedChannel: c }),

  playerItem: null,
  openPlayer: (item) => set({ playerItem: item }),
  closePlayer: () => set({ playerItem: null }),

  toast: (msg) => {
    // emit event sonner diretamente
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orange-toast", { detail: msg }));
    }
  },
}));
