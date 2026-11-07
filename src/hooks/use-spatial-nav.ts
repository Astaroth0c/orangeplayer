"use client";

import { useEffect, useRef } from "react";

/**
 * Hook global de navegação por controle remoto/teclado.
 * Escuta setas, Enter, Escape, Backspace e atalhos de mídia.
 * Dispara callbacks registrados via useKeyHandler.
 */

type KeyHandler = (e: KeyboardEvent) => void;
const handlers = new Set<KeyHandler>();

export function registerKeyHandler(h: KeyHandler) {
  handlers.add(h);
  return () => handlers.delete(h);
}

export function useSpatialNav() {
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const onKey = (e: KeyboardEvent) => {
      for (const h of handlers) {
        h(e);
      }
    };
    window.addEventListener("keydown", onKey, { capture: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      handlers.clear();
    };
  }, []);
}

export function useKeyHandler(handler: KeyHandler, deps: any[] = []) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => ref.current(e);
    handlers.add(h);
    return () => {
      handlers.delete(h);
    };
  }, deps);
}

/**
 * Navega o foco entre elementos focáveis dentro de um container
 * usando setas direcionais. Suporta layout em grid (linhas/colunas).
 */
export function useGridNavigation(containerRef: React.RefObject<HTMLElement | null>, options: {
  selector?: string;
  wrap?: boolean;
} = {}) {
  const selector = options.selector ?? "[data-focusable]";
  const wrap = options.wrap ?? true;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const move = (dx: number, dy: number) => {
      const focused = document.activeElement as HTMLElement | null;
      const items = Array.from(el.querySelectorAll<HTMLElement>(selector)).filter(
        (i) => i.offsetParent !== null,
      );
      if (items.length === 0) return;
      if (!focused || !el.contains(focused)) {
        items[0].focus();
        return;
      }
      const idx = items.indexOf(focused);
      if (idx < 0) {
        items[0].focus();
        return;
      }
      // Heurística: agrupar por bounding-box (y para linhas, x para colunas)
      const rect = (i: HTMLElement) => i.getBoundingClientRect();
      const fr = rect(focused);
      const sameRow = (a: HTMLElement) => Math.abs(rect(a).top - fr.top) < fr.height * 0.5;
      const sameCol = (a: HTMLElement) => Math.abs(rect(a).left - fr.left) < fr.width * 0.5;

      if (dx !== 0) {
        const candidates = items
          .map((it, i) => ({ it, i, r: rect(it) }))
          .filter(({ r, it }) => it !== focused && (dy === 0 ? sameRow(it) : sameCol(it)) && (dx > 0 ? r.left > fr.left + 1 : r.left < fr.left - 1))
          .sort((a, b) => (dx > 0 ? a.r.left - b.r.left : b.r.left - a.r.left));
        if (candidates[0]) {
          candidates[0].it.focus();
          candidates[0].it.scrollIntoView({ block: "nearest", inline: "nearest" });
          return;
        }
        if (wrap) {
          // wrap na mesma linha/coluna
          const line = items
            .map((it, i) => ({ it, i, r: rect(it) }))
            .filter(({ it }) => (dy === 0 ? sameRow(it) : sameCol(it)))
            .sort((a, b) => (dx > 0 ? a.r.left - b.r.left : b.r.left - a.r.left));
          if (line[0]) {
            line[0].it.focus();
            line[0].it.scrollIntoView({ block: "nearest", inline: "nearest" });
            return;
          }
        }
      }

      if (dy !== 0) {
        const candidates = items
          .map((it, i) => ({ it, i, r: rect(it) }))
          .filter(({ r, it }) => it !== focused && (dy > 0 ? r.top > fr.top + 1 : r.top < fr.top - 1))
          .sort((a, b) => {
            const da = Math.abs(a.r.left + a.r.width / 2 - (fr.left + fr.width / 2));
            const db = Math.abs(b.r.left + b.width / 2 - (fr.left + fr.width / 2));
            return (dy > 0 ? a.r.top - b.r.top : b.r.top - a.r.top) || da - db;
          });
        if (candidates[0]) {
          candidates[0].it.focus();
          candidates[0].it.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          move(1, 0);
          break;
        case "ArrowLeft":
          e.preventDefault();
          move(-1, 0);
          break;
        case "ArrowDown":
          e.preventDefault();
          move(0, 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          move(0, -1);
          break;
      }
    };

    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [containerRef, selector, wrap]);
}
