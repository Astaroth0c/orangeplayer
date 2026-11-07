"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarouselProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
  itemWidth?: number;
  gap?: number;
}

export function Carousel({
  title,
  children,
  className,
  headerExtra,
  itemWidth = 180,
  gap = 16,
}: CarouselProps) {
  const ref = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * (itemWidth + gap) * 3, behavior: "smooth" });
  };

  return (
    <section className={cn("relative", className)}>
      <header className="flex items-end justify-between mb-3 px-1">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {headerExtra}
          <button
            onClick={() => scrollBy(-1)}
            className="glass w-9 h-9 rounded-full grid place-items-center hover:brand-glow-soft hover:border-brand/50 transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="glass w-9 h-9 rounded-full grid place-items-center hover:brand-glow-soft hover:border-brand/50 transition-all"
            aria-label="Próximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1 scroll-snap-x"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
    </section>
  );
}

export function CarouselItem({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-focusable
      className={cn(
        "shrink-0 snap-start card-lift rounded-xl cursor-pointer",
        "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
        className,
      )}
      tabIndex={0}
      {...rest}
    >
      {children}
    </div>
  );
}
