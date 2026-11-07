// ===========================================================
// Player Store — estado de reprodução
// ===========================================================

import { create } from "zustand";

interface PlayerState {
  isPlaying: boolean;
  position: number; // segundos
  duration: number;
  volume: number; // 0..1
  muted: boolean;
  speed: number; // 0.5..2
  isFullscreen: boolean;
  controlsVisible: boolean;
  bufferState: "idle" | "buffering" | "ready" | "error";
  errorMessage: string | null;

  setPlaying: (v: boolean) => void;
  setPosition: (p: number) => void;
  setDuration: (d: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setSpeed: (s: number) => void;
  setFullscreen: (v: boolean) => void;
  setControlsVisible: (v: boolean) => void;
  setBufferState: (s: PlayerState["bufferState"]) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 1,
  muted: false,
  speed: 1,
  isFullscreen: false,
  controlsVisible: true,
  bufferState: "idle",
  errorMessage: null,

  setPlaying: (v) => set({ isPlaying: v }),
  setPosition: (p) => set({ position: p }),
  setDuration: (d) => set({ duration: d }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setSpeed: (s) => set({ speed: s }),
  setFullscreen: (v) => set({ isFullscreen: v }),
  setControlsVisible: (v) => set({ controlsVisible: v }),
  setBufferState: (s) => set({ bufferState: s }),
  setError: (msg) => set({ errorMessage: msg, bufferState: msg ? "error" : "idle" }),
  reset: () =>
    set({
      isPlaying: false,
      position: 0,
      duration: 0,
      bufferState: "idle",
      errorMessage: null,
      isFullscreen: false,
    }),
}));
