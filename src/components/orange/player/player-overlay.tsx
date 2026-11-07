"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Play, RotateCw } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { usePlayerStore } from "@/stores/player-store";
import { useKeyHandler } from "@/hooks/use-spatial-nav";
import { OrangeButton } from "@/components/orange/orange-button";
import type { AudioTrackInfo, TextTrackInfo, VideoPlayerHandle } from "./video-player";
import { VideoPlayer, fmtTime } from "./video-player";
import { ControlsBar, TopBar } from "./controls-bar";

// ===========================================================
// PlayerOverlay — top-level wrapper.
// Reads playerItem from the store and mounts the inner overlay
// keyed by item id so all internal state resets cleanly when
// the item changes (no setState-in-effect reset needed).
// ===========================================================

export function PlayerOverlay() {
  const item = useAppStore((s) => s.playerItem);
  if (!item) return null;
  return <PlayerOverlayInner key={item.id} item={item} />;
}

// ===========================================================
// PlayerOverlayInner — full-screen player shell
// ===========================================================

interface PlayerOverlayInnerProps {
  item: NonNullable<ReturnType<typeof useAppStore.getState>["playerItem"]>;
}

function PlayerOverlayInner({ item }: PlayerOverlayInnerProps) {
  const profile = useAppStore((s) => s.profile);

  const videoRef = useRef<VideoPlayerHandle>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // State for stream readiness + saved progress.
  // Channels don't have saved progress, so we mark them as "loaded"
  // from the start (avoids setState-in-effect). If there's no profile
  // we also can't fetch progress, so we start as "loaded" too.
  const isChannel = item.kind === "channel";
  const [videoReady, setVideoReady] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(isChannel || !profile);
  const [resumeInfo, setResumeInfo] = useState<{
    position: number;
    duration: number;
  } | null>(null);

  // Track lists for menus
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [textTracks, setTextTracks] = useState<TextTrackInfo[]>([]);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [subtitleEnabled, setSubtitleEnabled] = useState(false);

  // Activity tracker for auto-hide
  const [activity, setActivity] = useState(0);
  const bumpActivity = () => {
    usePlayerStore.getState().setControlsVisible(true);
    setActivity((a) => a + 1);
  };

  // -------- Reset player store for this item (once on mount) --------
  useEffect(() => {
    usePlayerStore.getState().reset();
    usePlayerStore.getState().setControlsVisible(true);
    usePlayerStore.getState().setVolume(1);
    usePlayerStore.getState().setSpeed(1);
  }, []);

  // -------- Fetch saved progress on mount (non-channel) --------
  useEffect(() => {
    if (isChannel) return; // nothing to fetch for LIVE
    if (!profile) return; // no profile = no progress to fetch
    let cancelled = false;
    fetch(
      `/api/history/progress?profileId=${profile.id}&itemType=${item.kind}&itemId=${item.id}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        // Only show resume dialog if playback hasn't started yet
        if (
          !usePlayerStore.getState().isPlaying &&
          data.progress &&
          data.progress.position > 5 &&
          !data.progress.completed
        ) {
          setResumeInfo({
            position: data.progress.position,
            duration: data.progress.duration,
          });
        }
        setProgressLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setProgressLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [item.id, item.kind, profile?.id, isChannel]);

  // -------- Auto-play when no resume needed --------
  useEffect(() => {
    if (!videoReady || !progressLoaded) return;
    if (resumeInfo) return; // wait for user choice
    videoRef.current?.play();
  }, [videoReady, progressLoaded, resumeInfo]);

  // -------- Resume dialog auto-dismiss (5s) → defaults to Continuar --------
  useEffect(() => {
    if (!resumeInfo) return;
    const t = setTimeout(() => {
      const pos = resumeInfo.position;
      setResumeInfo(null);
      videoRef.current?.seekTo(pos);
      videoRef.current?.play();
    }, 5000);
    return () => clearTimeout(t);
  }, [resumeInfo]);

  // -------- Fullscreen change listener --------
  useEffect(() => {
    const onFs = () => {
      usePlayerStore.getState().setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  // -------- Activity listeners (mouse move + click) --------
  useEffect(() => {
    const onMove = () => bumpActivity();
    const onClick = () => bumpActivity();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, []);

  // -------- Auto-hide controls after 3s of inactivity while playing --------
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const bufferState = usePlayerStore((s) => s.bufferState);
  const errorMessage = usePlayerStore((s) => s.errorMessage);
  const controlsVisible = usePlayerStore((s) => s.controlsVisible);
  const position = usePlayerStore((s) => s.position);

  useEffect(() => {
    if (!isPlaying) {
      usePlayerStore.getState().setControlsVisible(true);
      return;
    }
    if (bufferState === "buffering" || errorMessage) return;
    if (!controlsVisible) return;
    const t = setTimeout(() => {
      usePlayerStore.getState().setControlsVisible(false);
    }, 3000);
    return () => clearTimeout(t);
  }, [activity, isPlaying, bufferState, errorMessage, controlsVisible]);

  // -------- Keyboard controls --------
  useKeyHandler((e) => {
    bumpActivity();
    const tag = (e.target as HTMLElement | null)?.tagName;
    const isInput =
      tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    // Let native input handle arrow keys
    if (
      isInput &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      return;
    }
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        videoRef.current?.togglePlay();
        break;
      case "ArrowLeft":
      case "j":
        e.preventDefault();
        videoRef.current?.seekBy(-10);
        break;
      case "ArrowRight":
      case "l":
        e.preventDefault();
        videoRef.current?.seekBy(10);
        break;
      case "ArrowUp":
        e.preventDefault();
        videoRef.current?.setVolume(usePlayerStore.getState().volume + 0.1);
        break;
      case "ArrowDown":
        e.preventDefault();
        videoRef.current?.setVolume(usePlayerStore.getState().volume - 0.1);
        break;
      case "m":
      case "M":
        e.preventDefault();
        videoRef.current?.toggleMute();
        break;
      case "f":
      case "F":
        e.preventDefault();
        if (usePlayerStore.getState().isFullscreen) {
          videoRef.current?.exitFullscreen();
        } else {
          videoRef.current?.enterFullscreen(overlayRef.current);
        }
        break;
      case "Escape":
        e.preventDefault();
        if (usePlayerStore.getState().isFullscreen) {
          videoRef.current?.exitFullscreen();
        } else {
          useAppStore.getState().closePlayer();
        }
        break;
      default:
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          const n = parseInt(e.key, 10);
          const d = usePlayerStore.getState().duration;
          if (d > 0) videoRef.current?.seekTo((n / 10) * d);
        }
        break;
    }
  }, []);

  // -------- Handlers --------
  const handleContinue = () => {
    if (!resumeInfo) return;
    const pos = resumeInfo.position;
    setResumeInfo(null);
    videoRef.current?.seekTo(pos);
    videoRef.current?.play();
  };
  const handleRestart = () => {
    setResumeInfo(null);
    videoRef.current?.seekTo(0);
    videoRef.current?.play();
  };

  const handleNextEpisode = async () => {
    if (!item.nextEpisode || !profile) return;
    try {
      const res = await fetch(
        `/api/item/episode/${item.nextEpisode.id}?profileId=${profile.id}`,
      );
      const data = await res.json();
      if (data.item) {
        useAppStore.getState().openPlayer(data.item);
      }
    } catch {
      // ignore
    }
  };

  const hasRealSubs = textTracks.length > 0;
  const showDemoSubs = subtitleEnabled && !hasRealSubs && isPlaying;

  // Demo subtitle cues (cycles every 5s)
  const SAMPLE_CUES = [
    "Olá, bem-vindo ao ORANGE Player.",
    "Aproveite o conteúdo em alta qualidade.",
    "Use as setas para navegar.",
    "Pressione Espaço para pausar.",
    "Pressione F para tela cheia.",
  ];
  const cueIndex = Math.floor(position / 5) % SAMPLE_CUES.length;
  const subtitleText = SAMPLE_CUES[cueIndex];

  const resumePct =
    resumeInfo && resumeInfo.duration > 0
      ? Math.floor((resumeInfo.position / resumeInfo.duration) * 100)
      : 0;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 bg-black">
      <VideoPlayer
        ref={videoRef}
        item={item}
        profileId={profile?.id}
        onReady={() => setVideoReady(true)}
        onAudioTracksChange={setAudioTracks}
        onTextTracksChange={setTextTracks}
        onBufferedChange={setBufferedEnd}
        onPlayNext={handleNextEpisode}
      />

      {/* Demo subtitle overlay */}
      <AnimatePresence>
        {showDemoSubs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-32 flex justify-center pointer-events-none z-20 px-4"
          >
            <div className="glass-strong rounded-md px-4 py-1.5 max-w-2xl text-center">
              <p className="text-foreground text-base md:text-lg font-medium leading-snug">
                {subtitleText}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <AnimatePresence>
        {controlsVisible && !resumeInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 inset-x-0 z-40 bg-gradient-to-b from-black/85 via-black/55 to-transparent pb-8 pt-2"
          >
            <TopBar
              item={item}
              onClose={() => useAppStore.getState().closePlayer()}
              onDetails={() => useAppStore.getState().closePlayer()}
              onOpenSettings={() => {
                /* placeholder for settings popover (quality etc.) */
                useAppStore.getState().toast("Configurações do player");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <AnimatePresence>
        {controlsVisible && !resumeInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 inset-x-0 z-40 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-10"
          >
            <ControlsBar
              videoRef={videoRef}
              item={item}
              audioTracks={audioTracks}
              textTracks={textTracks}
              bufferedEnd={bufferedEnd}
              subtitleEnabled={subtitleEnabled}
              onToggleDemoSubtitle={() => setSubtitleEnabled((v) => !v)}
              onNextEpisode={handleNextEpisode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resume dialog */}
      <AnimatePresence>
        {resumeInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 grid place-items-center bg-black/70"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong rounded-2xl border border-white/10 px-8 py-7 max-w-md w-[min(90vw,30rem)] text-center shadow-2xl"
            >
              <div className="grid place-items-center w-14 h-14 rounded-full bg-brand/15 border border-brand/40 mx-auto mb-4">
                <RotateCw className="w-7 h-7 text-brand" />
              </div>
              <h3 className="text-foreground text-xl font-bold mb-1.5">
                Continuar reprodução?
              </h3>
              <p className="text-muted-foreground text-sm mb-1">
                Você parou em{" "}
                <span className="text-foreground font-semibold">
                  {fmtTime(resumeInfo.position)}
                </span>
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                {resumeInfo.duration > 0
                  ? `${resumePct}% concluído`
                  : "Progresso salvo"}
              </p>
              <div className="flex items-center justify-center gap-3">
                <OrangeButton
                  variant="primary"
                  size="lg"
                  icon={<Play className="w-4 h-4 fill-current" />}
                  onClick={handleContinue}
                >
                  Continuar
                </OrangeButton>
                <OrangeButton
                  variant="glass"
                  size="lg"
                  icon={<RotateCw className="w-4 h-4" />}
                  onClick={handleRestart}
                >
                  Reiniciar
                </OrangeButton>
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground/60">
                Continuando automaticamente em 5s...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle title hint when controls are hidden */}
      <AnimatePresence>
        {!controlsVisible && isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-4 z-30 pointer-events-none"
          >
            <div className="glass-strong rounded-full px-3 py-1.5 inline-flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-brand" />
              <span className="text-xs text-foreground/80 line-clamp-1 max-w-[40vw]">
                {item.title}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
