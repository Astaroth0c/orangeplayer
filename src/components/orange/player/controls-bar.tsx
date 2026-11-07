"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  FastForward,
  Info,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCw,
  Rewind,
  Settings,
  SkipForward,
  Subtitles,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePlayerStore } from "@/stores/player-store";
import { cn } from "@/lib/utils";
import { fmtTime, type AudioTrackInfo, type TextTrackInfo, type VideoPlayerHandle } from "./video-player";
import type { PlayerItem } from "@/types";

// ===========================================================
// Small popover menu used by speed/audio/subtitle buttons
// ===========================================================

function MiniMenu({
  open,
  onClose,
  children,
  align = "right",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest("[data-player-menu]")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      data-player-menu
      className={cn(
        "absolute bottom-full mb-3 z-40 min-w-44 glass-strong rounded-xl border border-white/10 p-1.5 shadow-2xl",
        align === "right" ? "right-0" : "left-0",
      )}
    >
      {children}
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-focusable
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        active
          ? "bg-brand/15 text-brand font-semibold"
          : "text-foreground/90 hover:bg-white/10 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ===========================================================
// Icon button (controls bar)
// ===========================================================

function CtrlButton({
  icon: Icon,
  label,
  onClick,
  active,
  badge,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-focusable
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "relative w-11 h-11 rounded-full grid place-items-center transition-colors",
        "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-black/40",
        active ? "text-brand" : "text-foreground/90",
        className,
      )}
    >
      <Icon className="w-5 h-5" />
      {badge && (
        <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold text-brand bg-black/70 rounded px-1 leading-tight border border-brand/40">
          {badge}
        </span>
      )}
    </button>
  );
}

// ===========================================================
// Speed options
// ===========================================================

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ===========================================================
// ControlsBar
// ===========================================================

interface ControlsBarProps {
  videoRef: React.RefObject<VideoPlayerHandle | null>;
  item: PlayerItem;
  audioTracks: AudioTrackInfo[];
  textTracks: TextTrackInfo[];
  bufferedEnd: number;
  subtitleEnabled: boolean;
  onToggleDemoSubtitle: () => void;
  onNextEpisode: () => void;
}

export function ControlsBar({
  videoRef,
  item,
  audioTracks,
  textTracks,
  bufferedEnd,
  subtitleEnabled,
  onToggleDemoSubtitle,
  onNextEpisode,
}: ControlsBarProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const speed = usePlayerStore((s) => s.speed);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);

  const [speedOpen, setSpeedOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeHideTimer = useRef<number | null>(null);

  const isLive = item.kind === "channel";
  const safeDuration = Math.max(0.1, duration || 0);
  const progressPct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  const togglePlay = () => videoRef.current?.togglePlay();
  const skipBack = () => videoRef.current?.seekBy(-10);
  const skipForward = () => videoRef.current?.seekBy(10);
  const onSeek = (val: number) => videoRef.current?.seekTo(val);
  const onVolume = (val: number) => videoRef.current?.setVolume(val);
  const toggleMute = () => videoRef.current?.toggleMute();
  const setSpeed = (s: number) => {
    videoRef.current?.setSpeed(s);
    setSpeedOpen(false);
  };
  const toggleFullscreen = () => {
    if (isFullscreen) videoRef.current?.exitFullscreen();
    else videoRef.current?.enterFullscreen(null);
  };

  const handleVolumeEnter = () => {
    setShowVolumeSlider(true);
    if (volumeHideTimer.current) window.clearTimeout(volumeHideTimer.current);
  };
  const handleVolumeLeave = () => {
    if (volumeHideTimer.current) window.clearTimeout(volumeHideTimer.current);
    volumeHideTimer.current = window.setTimeout(
      () => setShowVolumeSlider(false),
      1200,
    );
  };

  // Hover scrub for the progress bar (drag with mouse)
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const onSeekBarMove = (e: React.MouseEvent) => {
    if (!seekBarRef.current || duration <= 0) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setHoverPct(pct);
  };
  const onSeekBarLeave = () => setHoverPct(null);

  return (
    <div className="w-full select-none">
      {/* ===== Progress bar / LIVE indicator ===== */}
      {!isLive ? (
        <div className="px-4 pb-2 flex items-center gap-3">
          <span className="text-xs font-mono text-foreground/80 tabular-nums w-12 text-right shrink-0">
            {fmtTime(position)}
          </span>
          <div
            ref={seekBarRef}
            className="group/sb relative flex-1 h-4 flex items-center cursor-pointer"
            onMouseMove={onSeekBarMove}
            onMouseLeave={onSeekBarLeave}
          >
            {/* Track */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 w-full bg-white/20 rounded-full" />
            {/* Buffered fill */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-white/35 rounded-full pointer-events-none transition-[width] duration-150"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Hover hint */}
            {hoverPct !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-white/15 rounded-full pointer-events-none"
                style={{ left: `${progressPct}%`, width: `${Math.max(0, hoverPct - progressPct)}%` }}
              />
            )}
            {/* Progress fill */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-brand rounded-full pointer-events-none transition-[width] duration-100"
              style={{ width: `${progressPct}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-brand border-2 border-white shadow-[0_0_10px_rgba(255,120,31,0.7)] pointer-events-none transition-opacity duration-150 opacity-0 group-hover/sb:opacity-100"
              style={{ left: `${progressPct}%`, transform: "translate(-50%, -50%)" }}
            />
            {/* Invisible range input for seeking */}
            <input
              type="range"
              min={0}
              max={safeDuration}
              step={0.1}
              value={Math.min(position, safeDuration)}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Buscar posição"
            />
          </div>
          <span className="text-xs font-mono text-foreground/80 tabular-nums w-12 shrink-0">
            {fmtTime(duration)}
          </span>
        </div>
      ) : (
        <div className="px-4 pb-3 flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-brand/15 border border-brand/40 text-brand text-xs font-bold tracking-widest">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            AO VIVO
          </span>
          <button
            type="button"
            data-focusable
            onClick={() => videoRef.current?.seekToLive()}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium text-foreground/85 hover:text-foreground hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Tempo real
          </button>
        </div>
      )}

      {/* ===== Buttons row ===== */}
      <div className="px-4 pb-4 pt-1 flex items-center gap-1.5 flex-wrap">
        {/* Play/Pause */}
        <CtrlButton
          icon={isPlaying ? Pause : Play}
          label={isPlaying ? "Pausar" : "Reproduzir"}
          onClick={togglePlay}
        />
        {/* Skip back */}
        <CtrlButton icon={Rewind} label="Voltar 10s" onClick={skipBack} />
        {/* Skip forward */}
        <CtrlButton icon={FastForward} label="Avançar 10s" onClick={skipForward} />

        {/* Volume */}
        <div
          className="relative flex items-center"
          onMouseEnter={handleVolumeEnter}
          onMouseLeave={handleVolumeLeave}
        >
          <CtrlButton
            icon={muted || volume === 0 ? VolumeX : Volume2}
            label={muted ? "Ativar som" : "Silenciar"}
            onClick={toggleMute}
            active={muted}
          />
          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-out",
              showVolumeSlider ? "w-24 opacity-100" : "w-0 opacity-0",
            )}
          >
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              className="player-range"
              style={{ width: 100 }}
              aria-label="Volume"
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Speed */}
        <div className="relative">
          <MiniMenu open={speedOpen} onClose={() => setSpeedOpen(false)} align="right">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/80 font-semibold">
              Velocidade
            </div>
            {SPEED_OPTIONS.map((s) => (
              <MenuItem
                key={s}
                active={Math.abs(s - speed) < 0.001}
                onClick={() => setSpeed(s)}
              >
                {s}x {s === 1 && "(Normal)"}
              </MenuItem>
            ))}
          </MiniMenu>
          <button
            type="button"
            data-focusable
            onClick={() => setSpeedOpen((v) => !v)}
            aria-label="Velocidade"
            title="Velocidade"
            className={cn(
              "h-11 px-3 rounded-full inline-flex items-center gap-1 text-sm font-semibold transition-colors",
              "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              speed !== 1 ? "text-brand" : "text-foreground/90",
            )}
          >
            {speed}x
          </button>
        </div>

        {/* Subtitles */}
        <div className="relative">
          <MiniMenu open={subOpen} onClose={() => setSubOpen(false)} align="right">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/80 font-semibold">
              Legendas
            </div>
            {textTracks.length > 0 ? (
              <>
                <MenuItem
                  active={textTracks.every((t) => t.mode !== "showing")}
                  onClick={() => {
                    videoRef.current?.setTextTrack(null);
                    setSubOpen(false);
                  }}
                >
                  Desativadas
                </MenuItem>
                {textTracks.map((t) => (
                  <MenuItem
                    key={t.id}
                    active={t.mode === "showing"}
                    onClick={() => {
                      videoRef.current?.setTextTrack(t.id);
                      setSubOpen(false);
                    }}
                  >
                    {t.label} {t.language ? `(${t.language})` : ""}
                  </MenuItem>
                ))}
              </>
            ) : (
              <MenuItem active={subtitleEnabled} onClick={() => { onToggleDemoSubtitle(); setSubOpen(false); }}>
                {subtitleEnabled ? "Português (ativo)" : "Português (demo)"}
              </MenuItem>
            )}
          </MiniMenu>
          <CtrlButton
            icon={Subtitles}
            label="Legendas"
            onClick={() => setSubOpen((v) => !v)}
            active={subtitleEnabled || textTracks.some((t) => t.mode === "showing")}
          />
        </div>

        {/* Audio tracks */}
        {audioTracks.length > 1 && (
          <div className="relative">
            <MiniMenu open={audioOpen} onClose={() => setAudioOpen(false)} align="right">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/80 font-semibold">
                Faixa de áudio
              </div>
              {audioTracks.map((t) => (
                <MenuItem
                  key={t.id}
                  active={t.enabled}
                  onClick={() => {
                    videoRef.current?.setAudioTrack(t.id);
                    setAudioOpen(false);
                  }}
                >
                  {t.label} {t.language ? `(${t.language})` : ""}
                </MenuItem>
              ))}
            </MiniMenu>
            <CtrlButton
              icon={AudioLines}
              label="Faixa de áudio"
              onClick={() => setAudioOpen((v) => !v)}
              active={audioTracks.some((t) => t.enabled && t.language && t.language !== "")}
            />
          </div>
        )}

        {/* Next episode */}
        {item.nextEpisode && (
          <button
            type="button"
            data-focusable
            onClick={onNextEpisode}
            aria-label="Próximo episódio"
            title={`Próximo: ${item.nextEpisode.title}`}
            className={cn(
              "h-11 px-3 rounded-full inline-flex items-center gap-2 text-sm font-medium transition-colors",
              "text-foreground/90 hover:bg-white/10 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            )}
          >
            <SkipForward className="w-5 h-5" />
            <span className="hidden md:inline">Próximo</span>
          </button>
        )}

        {/* Fullscreen */}
        <CtrlButton
          icon={isFullscreen ? Minimize : Maximize}
          label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          onClick={toggleFullscreen}
        />
      </div>
    </div>
  );
}

// ===========================================================
// Top bar (close, title, details, settings)
// ===========================================================

interface TopBarProps {
  item: PlayerItem;
  onClose: () => void;
  onDetails: () => void;
  onOpenSettings: () => void;
}

export function TopBar({ item, onClose, onDetails, onOpenSettings }: TopBarProps) {
  return (
    <div className="w-full px-4 pt-4 pb-3 flex items-center gap-3">
      <button
        type="button"
        data-focusable
        onClick={onClose}
        aria-label="Fechar player"
        className="w-11 h-11 rounded-full grid place-items-center text-foreground/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0 text-center px-2">
        <h2 className="text-foreground font-semibold text-base md:text-lg leading-tight line-clamp-1">
          {item.title}
        </h2>
        {item.subtitle && (
          <p className="text-muted-foreground text-xs md:text-sm line-clamp-1 mt-0.5">
            {item.subtitle}
          </p>
        )}
      </div>
      {item.kind !== "channel" && (
        <button
          type="button"
          data-focusable
          onClick={onDetails}
          className="h-11 px-3 rounded-full inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
        >
          <Info className="w-5 h-5" />
          <span className="hidden md:inline">Detalhes</span>
        </button>
      )}
      <button
        type="button"
        data-focusable
        onClick={onOpenSettings}
        aria-label="Configurações"
        title="Configurações"
        className="w-11 h-11 rounded-full grid place-items-center text-foreground/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
      >
        <Settings className="w-5 h-5" />
      </button>
    </div>
  );
}
