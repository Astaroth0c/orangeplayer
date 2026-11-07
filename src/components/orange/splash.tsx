"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function Splash({ bootError }: { bootError: string | null }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(100, p + Math.random() * 12));
    }, 220);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* Aurora radial */}
      <div className="absolute inset-0 bg-radial-brand" />
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[50vw] h-[50vw] rounded-full bg-brand/8 blur-[100px]" />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Hex / Orange mark */}
        <motion.div
          initial={{ rotate: -8 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative"
        >
          <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-[0_0_40px_rgba(255,120,31,0.4)]">
            <defs>
              <linearGradient id="og" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFB45F" />
                <stop offset="0.5" stopColor="#FF781F" />
                <stop offset="1" stopColor="#E85D0F" />
              </linearGradient>
            </defs>
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
              d="M70 12 L120 40 L120 100 L70 128 L20 100 L20 40 Z"
              fill="none"
              stroke="url(#og)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <motion.circle
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6, ease: "backOut" }}
              cx="70"
              cy="70"
              r="22"
              fill="url(#og)"
            />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-8 text-5xl md:text-6xl font-extrabold tracking-tight"
        >
          <span className="text-brand-gradient">ORANGE</span>
          <span className="text-foreground ml-3 font-light">Player</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-3 text-muted-foreground text-sm md:text-base tracking-[0.3em] uppercase"
        >
          Multiplatform Entertainment
        </motion.p>
      </motion.div>

      {/* Progress bar */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-72 max-w-[80vw] z-10">
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
        <div className="mt-3 text-center text-xs text-muted-foreground/80 tracking-widest uppercase">
          {bootError ? "Modo offline" : "Inicializando experiência"}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-muted-foreground/50 tracking-widest uppercase z-10">
        Orange Glass UI · v1.0
      </div>
    </div>
  );
}
