"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Hls from "hls.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  Play,
  RotateCw,
  SkipForward,
  X,
} from "lucide-react";
import { usePlayerStore } from "@/stores/player-store";
import type { PlayerItem } from "@/types";

// ===========================================================
// Time formatting helpers
// ===========================================================

/** "MM:SS" if <3600 else "H:MM:SS" */
export function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export interface AudioTrackInfo {
  id: number;
  label: string;
  language: string;
  enabled: boolean;
}

export interface TextTrackInfo {
  id: number;
  label: string;
  language: string;
  mode: "disabled" | "hidden" | "showing";
}

export interface VideoPlayerHandle {
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (position: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setSpeed: (s: number) => void;
  getVideo: () => HTMLVideoElement | null;
  getBufferedEnd: () => number;
  getAudioTracks: () => AudioTrackInfo[];
  getTextTracks: () => TextTrackInfo[];
  setAudioTrack: (id: number) => void;
  setTextTrack: (id: number | null) => void;
  reload: () => void;
  seekToLive: () => void;
  enterFullscreen: (el: HTMLElement | null) => Promise<void>;
  exitFullscreen: () => Promise<void>;
}

interface VideoPlayerProps {
  item: PlayerItem;
  profileId?: string;
  onReady?: () => void;
  onEnded?: () => void;
  onAudioTracksChange?: (tracks: AudioTrackInfo[]) => void;
  onTextTracksChange?: (tracks: TextTrackInfo[]) => void;
  onBufferedChange?: (end: number) => void;
  onPlayNext?: () => void;
}

// ===========================================================
// VideoPlayer
// ===========================================================

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer(
    {
      item,
      profileId,
      onReady,
      onEnded,
      onAudioTracksChange,
      onTextTracksChange,
      onBufferedChange,
      onPlayNext,
    },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const readyFiredRef = useRef(false);
    const lastSavedRef = useRef<{ position: number; duration: number }>({
      position: 0,
      duration: 0,
    });
    const lastTimeUpdateRef = useRef(0);
    const onReadyRef = useRef(onReady);
    const onEndedRef = useRef(onEnded);
    const onPlayNextRef = useRef(onPlayNext);
    const itemRef = useRef(item);
    const profileIdRef = useRef(profileId);
    const savingRef = useRef(false);

    onReadyRef.current = onReady;
    onEndedRef.current = onEnded;
    onPlayNextRef.current = onPlayNext;
    itemRef.current = item;
    profileIdRef.current = profileId;

    const [showNextOverlay, setShowNextOverlay] = useState(false);
    const [countdown, setCountdown] = useState(10);

    // -------- Progress saving to /api/history --------
    const saveProgress = useCallback(
      async (opts: { completed?: boolean } = {}) => {
        const video = videoRef.current;
        const prof = profileIdRef.current;
        const it = itemRef.current;
        if (!video || !prof || !it) return;
        if (it.kind === "channel") return; // never save for LIVE
        if (savingRef.current) return;
        savingRef.current = true;
        try {
          const position = opts.completed
            ? Math.floor(video.duration || 0)
            : Math.floor(video.currentTime || 0);
          const duration = Math.floor(video.duration || 0);
          lastSavedRef.current = { position, duration };
          await fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profileId: prof,
              itemType: it.kind,
              itemId: it.id,
              title: it.title,
              poster: it.poster,
              backdrop: it.backdrop,
              duration,
              position,
              completed: !!opts.completed,
              episodeId: it.episodeId,
            }),
          }).catch(() => {});
        } finally {
          savingRef.current = false;
        }
      },
      [],
    );

    // -------- Main HLS / native setup effect --------
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Reset store for new item
      const store = usePlayerStore.getState();
      store.reset();
      store.setBufferState("buffering");
      store.setError(null);
      store.setControlsVisible(true);
      readyFiredRef.current = false;
      lastSavedRef.current = { position: 0, duration: 0 };
      setShowNextOverlay(false);

      const url = item.streamUrl;
      let hls: Hls | null = null;

      // --- Event handlers (named so we can remove them) ---
      const onPlay = () => usePlayerStore.getState().setPlaying(true);
      const onPause = () => {
        usePlayerStore.getState().setPlaying(false);
        // Save immediately on pause (for non-LIVE)
        if (itemRef.current.kind !== "channel") {
          saveProgress();
        }
      };
      const onTimeUpdate = () => {
        const now = performance.now();
        if (now - lastTimeUpdateRef.current < 1000) return;
        lastTimeUpdateRef.current = now;
        const pos = video.currentTime;
        usePlayerStore.getState().setPosition(pos);
        lastSavedRef.current.position = Math.floor(pos);
      };
      const onLoadedMetadata = () => {
        usePlayerStore.getState().setDuration(video.duration);
        lastSavedRef.current.duration = Math.floor(video.duration || 0);
        if (!readyFiredRef.current) {
          readyFiredRef.current = true;
          onReadyRef.current?.();
        }
        // push track info
        pushAudioTracks();
        pushTextTracks();
      };
      const onVolumeChange = () => {
        const s = usePlayerStore.getState();
        s.setVolume(video.volume);
        if (s.muted !== video.muted) s.toggleMute();
      };
      const onRateChange = () => {
        usePlayerStore.getState().setSpeed(video.playbackRate);
      };
      const onWaiting = () => {
        usePlayerStore.getState().setBufferState("buffering");
      };
      const onPlaying = () => {
        usePlayerStore.getState().setBufferState("ready");
      };
      const onCanPlay = () => {
        usePlayerStore.getState().setBufferState("ready");
      };
      const onEndedHandler = () => {
        // mark completed (for movies/episodes)
        if (itemRef.current.kind !== "channel") {
          saveProgress({ completed: true });
        }
        // Auto-play next episode if available
        if (itemRef.current.kind === "episode" && itemRef.current.nextEpisode) {
          setShowNextOverlay(true);
          setCountdown(10);
        } else {
          onEndedRef.current?.();
        }
      };
      const onError = () => {
        // Native error (non-HLS or Safari native HLS)
        const code = video.error?.code;
        let msg = "Falha ao reproduzir o vídeo.";
        if (code === 2) msg = "Falha de conexão. Verifique sua internet.";
        else if (code === 3) msg = "Falha de decodificação.";
        else if (code === 4) msg = "Formato não suportado neste dispositivo.";
        usePlayerStore.getState().setError(msg);
      };

      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("volumechange", onVolumeChange);
      video.addEventListener("ratechange", onRateChange);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlaying);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("ended", onEndedHandler);
      video.addEventListener("error", onError);

      const pushAudioTracks = () => {
        if (!onAudioTracksChange) return;
        try {
          const list: AudioTrackInfo[] = [];
          const at = (video as any).audioTracks as any | undefined;
          if (at) {
            for (let i = 0; i < at.length; i++) {
              const t = at[i];
              list.push({
                id: i,
                label: t.label || t.language || `Faixa ${i + 1}`,
                language: t.language || "",
                enabled: t.enabled,
              });
            }
          }
          onAudioTracksChange(list);
        } catch {
          onAudioTracksChange([]);
        }
      };
      const pushTextTracks = () => {
        if (!onTextTracksChange) return;
        try {
          const list: TextTrackInfo[] = [];
          for (let i = 0; i < video.textTracks.length; i++) {
            const t = video.textTracks[i];
            list.push({
              id: i,
              label: t.label || t.language || `Legenda ${i + 1}`,
              language: t.language || "",
              mode: t.mode,
            });
          }
          onTextTracksChange(list);
        } catch {
          onTextTracksChange([]);
        }
      };

      // --- Stream setup ---
      if (url.includes("m3u8")) {
        if (Hls.isSupported()) {
          hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            enableWorker: true,
          });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            // onLoadedMetadata will fire after attach
          });
          hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, pushAudioTracks);
          hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, pushTextTracks);
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            const store = usePlayerStore.getState();
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // try to recover network
              try {
                hls?.startLoad();
              } catch {
                store.setError("Falha de conexão. Verifique sua internet.");
              }
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              try {
                hls?.recoverMediaError();
              } catch {
                store.setError("Formato não suportado neste dispositivo.");
              }
            } else {
              store.setError("Falha de conexão. Verifique sua internet.");
              hls?.destroy();
              hlsRef.current = null;
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari native HLS
          video.src = url;
        } else {
          usePlayerStore.getState().setError(
            "Formato não suportado neste dispositivo.",
          );
        }
      } else {
        // MP4 / native
        video.src = url;
      }

      // --- Periodic buffered-end polling ---
      const bufferedInterval = setInterval(() => {
        if (video.buffered.length > 0 && video.duration > 0) {
          const end = video.buffered.end(video.buffered.length - 1);
          onBufferedChange?.(end);
        }
      }, 250);

      return () => {
        clearInterval(bufferedInterval);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("volumechange", onVolumeChange);
        video.removeEventListener("ratechange", onRateChange);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("ended", onEndedHandler);
        video.removeEventListener("error", onError);
        if (hls) {
          hls.destroy();
        }
        hlsRef.current = null;
        // Final save on unmount/switch (non-LIVE)
        if (itemRef.current.kind !== "channel") {
          // Fire and forget
          saveProgress();
        }
        video.removeAttribute("src");
        try {
          video.load();
        } catch {
          // ignore
        }
      };
    }, [item.streamUrl, saveProgress]);

    // -------- Periodic progress save (every 5s while playing) --------
    useEffect(() => {
      if (item.kind === "channel") return;
      const interval = setInterval(() => {
        const s = usePlayerStore.getState();
        if (s.isPlaying && s.bufferState !== "error") {
          saveProgress();
        }
      }, 5000);
      return () => clearInterval(interval);
    }, [item.kind, saveProgress]);

    // -------- Next-episode countdown --------
    useEffect(() => {
      if (!showNextOverlay) return;
      if (countdown <= 0) {
        onPlayNextRef.current?.();
        setShowNextOverlay(false);
        return;
      }
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }, [showNextOverlay, countdown]);

    // -------- Imperative handle --------
    useImperativeHandle(
      ref,
      (): VideoPlayerHandle => ({
        play: async () => {
          try {
            await videoRef.current?.play();
          } catch {
            // autoplay may be blocked
          }
        },
        pause: () => {
          videoRef.current?.pause();
        },
        togglePlay: () => {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        },
        seekTo: (position) => {
          const v = videoRef.current;
          if (!v) return;
          if (!Number.isFinite(position)) return;
          v.currentTime = Math.max(0, Math.min(position, v.duration || position));
          usePlayerStore.getState().setPosition(v.currentTime);
        },
        seekBy: (delta) => {
          const v = videoRef.current;
          if (!v) return;
          v.currentTime = Math.max(0, Math.min(v.currentTime + delta, v.duration));
          usePlayerStore.getState().setPosition(v.currentTime);
        },
        setVolume: (val) => {
          const v = videoRef.current;
          if (!v) return;
          const vol = Math.max(0, Math.min(1, val));
          v.volume = vol;
          if (vol > 0 && v.muted) v.muted = false;
          usePlayerStore.getState().setVolume(vol);
        },
        toggleMute: () => {
          const v = videoRef.current;
          if (!v) return;
          v.muted = !v.muted;
          usePlayerStore.getState().toggleMute();
        },
        setSpeed: (s) => {
          const v = videoRef.current;
          if (!v) return;
          v.playbackRate = s;
          usePlayerStore.getState().setSpeed(s);
        },
        getVideo: () => videoRef.current,
        getBufferedEnd: () => {
          const v = videoRef.current;
          if (!v || v.buffered.length === 0) return 0;
          return v.buffered.end(v.buffered.length - 1);
        },
        getAudioTracks: () => {
          const v = videoRef.current as any;
          if (!v) return [];
          const list: AudioTrackInfo[] = [];
          const at = v.audioTracks as any | undefined;
          if (at) {
            for (let i = 0; i < at.length; i++) {
              const t = at[i];
              list.push({
                id: i,
                label: t.label || t.language || `Faixa ${i + 1}`,
                language: t.language || "",
                enabled: t.enabled,
              });
            }
          }
          return list;
        },
        getTextTracks: () => {
          const v = videoRef.current;
          if (!v) return [];
          const list: TextTrackInfo[] = [];
          for (let i = 0; i < v.textTracks.length; i++) {
            const t = v.textTracks[i];
            list.push({
              id: i,
              label: t.label || t.language || `Legenda ${i + 1}`,
              language: t.language || "",
              mode: t.mode,
            });
          }
          return list;
        },
        setAudioTrack: (id) => {
          const v = videoRef.current as any;
          if (!v) return;
          const at = v.audioTracks as any | undefined;
          if (!at) return;
          for (let i = 0; i < at.length; i++) {
            at[i].enabled = i === id;
          }
        },
        setTextTrack: (id) => {
          const v = videoRef.current;
          if (!v) return;
          for (let i = 0; i < v.textTracks.length; i++) {
            v.textTracks[i].mode = i === id ? "showing" : "disabled";
          }
        },
        reload: () => {
          const v = videoRef.current;
          if (!v) return;
          usePlayerStore.getState().setBufferState("buffering");
          usePlayerStore.getState().setError(null);
          readyFiredRef.current = false;
          if (hlsRef.current) {
            // Reload HLS from scratch
            const url = item.streamUrl;
            hlsRef.current.destroy();
            const newHls = new Hls({
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
              enableWorker: true,
            });
            hlsRef.current = newHls;
            newHls.loadSource(url);
            newHls.attachMedia(v);
          } else {
            // Native reload
            const src = v.src;
            v.removeAttribute("src");
            v.load();
            v.src = src;
            v.load();
          }
        },
        seekToLive: () => {
          const v = videoRef.current;
          if (!v) return;
          if (v.seekable.length > 0) {
            v.currentTime = v.seekable.end(v.seekable.length - 1);
          }
        },
        enterFullscreen: async (el) => {
          const target = el || videoRef.current?.parentElement;
          if (!target) return;
          try {
            if (target.requestFullscreen) {
              await target.requestFullscreen();
            } else if ((target as any).webkitRequestFullscreen) {
              await (target as any).webkitRequestFullscreen();
            } else if ((target as any).webkitEnterFullscreen) {
              await (target as any).webkitEnterFullscreen();
            }
            usePlayerStore.getState().setFullscreen(true);
          } catch {
            // ignore
          }
        },
        exitFullscreen: async () => {
          try {
            if (document.fullscreenElement && document.exitFullscreen) {
              await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen();
            }
            usePlayerStore.getState().setFullscreen(false);
          } catch {
            // ignore
          }
        },
      }),
      [item.streamUrl],
    );

    const isLive = item.kind === "channel";
    const bufferState = usePlayerStore((s) => s.bufferState);
    const errorMessage = usePlayerStore((s) => s.errorMessage);
    const isPlaying = usePlayerStore((s) => s.isPlaying);

    return (
      <div className="relative w-full h-full bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          playsInline
          autoPlay={false}
          preload="auto"
          crossOrigin="anonymous"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            usePlayerStore.getState().setControlsVisible(true);
            if (v.paused) v.play().catch(() => {});
            else v.pause();
          }}
          onDoubleClick={() => {
            const v = videoRef.current;
            if (!v) return;
            const container = v.parentElement?.parentElement;
            if (document.fullscreenElement) {
              document.exitFullscreen?.().catch(() => {});
              usePlayerStore.getState().setFullscreen(false);
            } else if (container?.requestFullscreen) {
              container.requestFullscreen().catch(() => {});
              usePlayerStore.getState().setFullscreen(true);
            }
          }}
        />

        {/* Buffering spinner */}
        <AnimatePresence>
          {bufferState === "buffering" && !errorMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center pointer-events-none"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-brand animate-spin-slow" />
                <span className="text-sm text-white/80 tracking-wide">
                  Carregando...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center big play button when paused */}
        <AnimatePresence>
          {!isPlaying && bufferState !== "buffering" && !errorMessage && !showNextOverlay && (
            <motion.button
              key="center-play"
              type="button"
              onClick={() => videoRef.current?.play().catch(() => {})}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="absolute inset-0 grid place-items-center group z-20"
              aria-label="Reproduzir"
            >
              <span className="grid place-items-center w-20 h-20 rounded-full glass-strong border border-brand/40 brand-glow-soft group-hover:brand-glow transition-all duration-200 group-hover:scale-105">
                <Play className="w-9 h-9 text-brand translate-x-0.5 fill-brand" />
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Error overlay */}
        <AnimatePresence>
          {bufferState === "error" && errorMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center bg-black/80 z-30"
            >
              <div className="glass-strong rounded-2xl border border-white/10 px-8 py-7 max-w-md text-center">
                <AlertCircle className="w-12 h-12 text-brand mx-auto mb-4" />
                <p className="text-foreground font-semibold text-lg mb-1">
                  Erro de reprodução
                </p>
                <p className="text-muted-foreground text-sm mb-6">
                  {errorMessage}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    usePlayerStore.getState().setBufferState("buffering");
                    usePlayerStore.getState().setError(null);
                    readyFiredRef.current = false;
                    if (hlsRef.current) {
                      // Reload HLS from scratch
                      const url = item.streamUrl;
                      hlsRef.current.destroy();
                      const nh = new Hls({
                        maxBufferLength: 30,
                        maxMaxBufferLength: 60,
                        enableWorker: true,
                      });
                      hlsRef.current = nh;
                      nh.loadSource(url);
                      nh.attachMedia(v);
                    } else {
                      // Native reload
                      const src = v.src;
                      v.removeAttribute("src");
                      v.load();
                      v.src = src;
                      v.load();
                    }
                  }}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-brand text-graphite font-semibold hover:bg-brand-light transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <RotateCw className="w-4 h-4" />
                  Tentar novamente
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next episode countdown overlay */}
        <AnimatePresence>
          {showNextOverlay && item.nextEpisode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 bottom-28 z-30 flex justify-center pointer-events-none"
            >
              <div className="glass-strong rounded-2xl border border-white/10 px-6 py-5 flex items-center gap-5 pointer-events-auto">
                <div className="grid place-items-center w-12 h-12 rounded-full bg-brand/15 border border-brand/40">
                  <SkipForward className="w-6 h-6 text-brand" />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-widest text-brand font-semibold">
                    Próximo episódio em {countdown}s
                  </p>
                  <p className="text-foreground font-medium text-sm mt-0.5 line-clamp-1">
                    {item.nextEpisode.title}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    T{item.nextEpisode.season}E{item.nextEpisode.episode}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    type="button"
                    onClick={() => {
                      onPlayNextRef.current?.();
                      setShowNextOverlay(false);
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-brand text-graphite font-semibold text-sm hover:bg-brand-light transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Reproduzir
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNextOverlay(false)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md text-foreground/80 hover:text-foreground hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    aria-label="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden helper text for live badge (rendered in controls) */}
        {isLive && <span className="sr-only">Transmissão ao vivo</span>}
      </div>
    );
  },
);
