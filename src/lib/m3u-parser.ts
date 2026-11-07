// ===========================================================
// M3U / M3U8 Parser — Robusto e tolerante a malformações
// ===========================================================

export interface ParsedM3UEntry {
  name: string;
  logo?: string;
  streamUrl: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
  language?: string;
  country?: string;
  contentType?: string; // video | series | movie | live
}

export interface ParsedM3UResult {
  entries: ParsedM3UEntry[];
  errors: string[];
}

/**
 * Faz o parse de uma playlist M3U/M3U8.
 * Suporta #EXTINF com atributos tvg-id, tvg-logo, group-title, tvg-name.
 * Suporta #EXTGRP.
 * Tolerante a linhas em branco e a atributos sem aspas.
 */
export function parseM3U(content: string): ParsedM3UResult {
  const errors: string[] = [];
  const entries: ParsedM3UEntry[] = [];

  if (!content || typeof content !== "string") {
    return { entries, errors: ["Conteúdo vazio."] };
  }

  const trimmed = content.trim();
  if (!trimmed.startsWith("#EXTM3U") && !trimmed.includes("#EXTINF")) {
    errors.push("Formato M3U inválido: cabeçalho #EXTM3U ausente.");
  }

  const lines = trimmed.split(/\r?\n/);
  let current: Partial<ParsedM3UEntry> | null = null;
  let pendingGroup: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTM3U")) continue;

    if (line.startsWith("#EXTGRP:")) {
      pendingGroup = decode(line.slice("#EXTGRP:".length).trim());
      continue;
    }

    if (line.startsWith("#EXTINF")) {
      const info = line.slice(line.indexOf(":") + 1);
      const lastComma = info.lastIndexOf(",");
      const name = lastComma >= 0 ? info.slice(lastComma + 1).trim() : info.trim();
      const attrs = lastComma >= 0 ? info.slice(0, lastComma) : "";

      current = {
        name: decode(name),
        logo: readAttr(attrs, "tvg-logo"),
        group: readAttr(attrs, "group-title") ?? pendingGroup,
        tvgId: readAttr(attrs, "tvg-id"),
        tvgName: readAttr(attrs, "tvg-name"),
        language: readAttr(attrs, "tvg-language"),
        country: readAttr(attrs, "tvg-country"),
        contentType: readAttr(attrs, "type"),
      };
      pendingGroup = undefined;
      continue;
    }

    // Linha que começa com # mas não é EXTINF — ignoramos silenciosamente
    if (line.startsWith("#")) continue;

    // URL do stream
    if (current) {
      const streamUrl = line.trim();
      entries.push({
        name: current.name ?? "Sem nome",
        logo: current.logo ?? undefined,
        streamUrl,
        group: current.group ?? undefined,
        tvgId: current.tvgId ?? undefined,
        tvgName: current.tvgName ?? undefined,
        language: current.language ?? undefined,
        country: current.country ?? undefined,
        contentType: current.contentType ?? undefined,
      });
      current = null;
    }
  }

  if (entries.length === 0) {
    errors.push("Nenhuma entrada encontrada no M3U.");
  }

  return { entries, errors };
}

function readAttr(attrs: string, key: string): string | undefined {
  // aceita key="valor" e key=valor
  const re = new RegExp(`${key}=(?:"([^"]*)"|([^\\s,]+))`, "i");
  const m = attrs.match(re);
  if (!m) return undefined;
  const val = m[1] ?? m[2];
  return val ? decode(val.trim()) : undefined;
}

function decode(s: string): string {
  try {
    return decodeURIComponent(escape(s));
  } catch {
    return s;
  }
}

/**
 * Heurística para classificar uma entrada M3U em movie/series/live.
 */
export function classifyM3UEntry(entry: ParsedM3UEntry): "movie" | "series" | "live" {
  const group = (entry.group ?? "").toLowerCase();
  const name = entry.name.toLowerCase();

  if (entry.contentType === "series" || /serie[s]?|series|tv show|season|temporada|s\d{1,2}e\d{1,2}/i.test(name)) {
    return "series";
  }
  if (entry.contentType === "movie" || /filme[s]?|movie|vod|on demand/i.test(group) || /filme[s]?|movie/i.test(name)) {
    return "movie";
  }
  // default: live
  return "live";
}

/**
 * Para entradas de série, tenta extrair temporada/episódio do nome.
 */
export function parseSeriesEpisodeInfo(name: string): { show: string; season?: number; episode?: number } {
  const m = name.match(/^(.*?)[\s\-:]*S(\d{1,2})E(\d{1,3})/i);
  if (m) {
    return { show: m[1].trim(), season: parseInt(m[2], 10), episode: parseInt(m[3], 10) };
  }
  const m2 = name.match(/^(.*?)[\s\-:]*Temporada\s*(\d{1,2})/i);
  if (m2) {
    return { show: m2[1].trim(), season: parseInt(m2[2], 10) };
  }
  return { show: name };
}
