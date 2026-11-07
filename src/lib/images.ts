// ===========================================================
// Imagens — utilitários e fallbacks para posters (fallback)
// ===========================================================

/**
 * Gera uma URL determinística de poster para posters (fallback).
 * Usa picsum.photos com seed para imagens consistentes.
 */
export function posterUrl(seed: string, w = 400, h = 600): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

export function backdropUrl(seed: string, w = 1280, h = 720): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}-bd/${w}/${h}`;
}

export function logoUrl(seed: string, s = 128): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}-logo/${s}/${s}`;
}

/**
 * SVG data-URL placeholder com gradiente laranja e título.
 * Usado como fallback quando uma imagem remota falha.
 */
export function placeholderPoster(title: string, subtitle?: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='#1B222A'/>
        <stop offset='0.6' stop-color='#101419'/>
        <stop offset='1' stop-color='#0B0E12'/>
      </linearGradient>
      <radialGradient id='r' cx='0.5' cy='0.3' r='0.6'>
        <stop offset='0' stop-color='#FF781F' stop-opacity='0.35'/>
        <stop offset='1' stop-color='#FF781F' stop-opacity='0'/>
      </radialGradient>
    </defs>
    <rect width='400' height='600' fill='url(#g)'/>
    <rect width='400' height='600' fill='url(#r)'/>
    <rect x='1' y='1' width='398' height='598' fill='none' stroke='#FF781F' stroke-opacity='0.25' stroke-width='1'/>
    <text x='200' y='290' font-family='Inter, sans-serif' font-size='24' font-weight='700'
          fill='#F4F6F8' text-anchor='middle' opacity='0.95'>${escapeXml(title)}</text>
    ${subtitle ? `<text x='200' y='325' font-family='Inter, sans-serif' font-size='14' fill='#AEB7C2' text-anchor='middle'>${escapeXml(subtitle)}</text>` : ""}
    <text x='200' y='560' font-family='Inter, sans-serif' font-size='12' font-weight='600'
          fill='#FF781F' text-anchor='middle' letter-spacing='3'>ORANGE</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function placeholderBackdrop(title: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720' viewBox='0 0 1280 720'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='#101419'/>
        <stop offset='0.5' stop-color='#1B222A'/>
        <stop offset='1' stop-color='#0B0E12'/>
      </linearGradient>
      <radialGradient id='r' cx='0.7' cy='0.4' r='0.7'>
        <stop offset='0' stop-color='#FF781F' stop-opacity='0.25'/>
        <stop offset='1' stop-color='#FF781F' stop-opacity='0'/>
      </radialGradient>
    </defs>
    <rect width='1280' height='720' fill='url(#g)'/>
    <rect width='1280' height='720' fill='url(#r)'/>
    <text x='640' y='380' font-family='Inter, sans-serif' font-size='52' font-weight='800'
          fill='#F4F6F8' text-anchor='middle' opacity='0.85'>${escapeXml(title)}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function placeholderLogo(name: string): string {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
    <rect width='128' height='128' rx='20' fill='#1B222A'/>
    <rect x='1' y='1' width='126' height='126' rx='19' fill='none' stroke='#FF781F' stroke-opacity='0.4'/>
    <text x='64' y='78' font-family='Inter, sans-serif' font-size='44' font-weight='800'
          fill='#FF781F' text-anchor='middle'>${escapeXml(initials || "TV")}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Hook para lidar com erro de carregamento de imagem, trocando por placeholder.
 */
export function handleImgError(e: React.SyntheticEvent<HTMLImageElement>, fallback: string) {
  const img = e.currentTarget;
  if (img.src !== fallback) {
    img.src = fallback;
  }
}
