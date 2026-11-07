"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { placeholderPoster } from "@/lib/images";

interface PosterProps {
  src?: string | null;
  title: string;
  subtitle?: string;
  className?: string;
  aspect?: "portrait" | "landscape" | "square";
  rounded?: "md" | "lg" | "xl";
  priority?: boolean;
}

export function Poster({
  src,
  title,
  subtitle,
  className,
  aspect = "portrait",
  rounded = "lg",
  priority = false,
}: PosterProps) {
  const [error, setError] = useState(false);
  const aspectClass =
    aspect === "portrait"
      ? "aspect-[2/3]"
      : aspect === "landscape"
      ? "aspect-[16/9]"
      : "aspect-square";
  const roundedClass = rounded === "xl" ? "rounded-2xl" : rounded === "md" ? "rounded-md" : "rounded-lg";
  const fallback = placeholderPoster(title, subtitle);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-graphite/60",
        aspectClass,
        roundedClass,
        className,
      )}
    >
      <img
        src={error || !src ? fallback : src}
        alt={title}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setError(true)}
        className="h-full w-full object-cover transition-transform duration-500"
      />
      {/* Glass overlay no rodapé */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
    </div>
  );
}

export function BackdropImage({
  src,
  alt,
  className,
  children,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  children?: ReactNode;
}) {
  const [error, setError] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-graphite", className)}>
      {src && !error ? (
        <img
          src={src}
          alt={alt}
          onError={() => setError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-surface via-graphite to-background" />
      )}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      {children}
    </div>
  );
}
