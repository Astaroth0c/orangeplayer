// ===========================================================
// Xtream Codes API Client (compatível)
// ===========================================================
// Implementa as chamadas de API mais comuns do formato Xtream Codes:
//   - player_api.php?username=...&password=...&action=...
//   - XMLTV: xmltv.php?username=...&password=...
// Não armazena credenciais em logs.

export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export interface XtreamUserInfo {
  user_info?: {
    username?: string;
    password?: string;
    auth?: number;
    status?: string;
    exp_date?: string | null;
    is_trial?: string;
    active_cons?: string;
    created_at?: string;
    max_connections?: string;
    allowed_output_formats?: string[];
  };
  server_info?: {
    url?: string;
    port?: string;
    https_port?: string;
    server_protocol?: string;
    rtmp_port?: string;
    timezone?: string;
    timestamp_now?: number;
    time_now?: string;
  };
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface XtreamStream {
  num?: number;
  stream_id?: string;
  name?: string;
  title?: string;
  year?: string;
  stream_icon?: string;
  epg_channel_id?: string;
  added?: string;
  category_id?: string;
  container_extension?: string;
  custom_sid?: string;
  tv_archive?: number;
  direct_source?: string;
  tv_archive_duration?: number;
  rating?: string;
  rating_5based?: number;
}

export interface XtreamSeries {
  num?: number;
  series_id?: string;
  name?: string;
  title?: string;
  year?: string;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  last_modified?: string;
  rating?: string;
  rating_5based?: number;
  backdrop_path?: string[];
  youtube_trailer?: string;
  episode_run_time?: string;
  category_id?: string;
}

export interface XtreamSeriesInfo {
  info?: {
    name?: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string;
    backdrop_path?: string[];
    youtube_trailer?: string;
    episode_run_time?: string;
    category_id?: string;
  };
  seasons?: Array<{
    season_number?: number;
    name?: string;
    cover?: string;
    overview?: string;
    air_date?: string;
    episodes?: XtreamEpisode[];
  }>;
  episodes?: Record<string, XtreamEpisode[]>;
}

export interface XtreamEpisode {
  id?: string;
  episode_num?: number | string;
  title?: string;
  container_extension?: string;
  info?: { movie_image?: string; plot?: string; duration?: string; rating?: string };
  season?: number;
  info_json?: string;
}

export interface XtreamVodInfo {
  info?: {
    movie_image?: string;
    backdrop_path?: string[];
    youtube_trailer?: string;
    genre?: string;
    plot?: string;
    cast?: string;
    rating?: string;
    director?: string;
    releasedate?: string;
    tmdb_id?: string;
    duration?: string;
    duration_secs?: number;
  };
  movie_data?: {
    stream_id?: string;
    name?: string;
    container_extension?: string;
  };
}

function base(creds: XtreamCredentials): string {
  let url = creds.serverUrl.trim();
  if (!url) return "";
  url = url.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

function authParams(creds: XtreamCredentials): URLSearchParams {
  return new URLSearchParams({
    username: creds.username,
    password: creds.password,
  });
}

function safeUrl(url: string): string {
  // Remove credenciais para logging
  return url.replace(/(username|password)=([^&]+)/gi, (_, key: string) => `${key}=***`);
}

async function call<T>(creds: XtreamCredentials, action?: string): Promise<T> {
  const base = base(creds);
  if (!base) throw new Error("URL do servidor Xtream inválida.");
  const params = authParams(creds);
  if (action) params.set("action", action);
  const url = `${base}/player_api.php?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ORANGE-Player/1.0",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Resposta ${res.status} do servidor Xtream.`);
    }
    const text = await res.text();
    if (!text || text.trim().startsWith("<")) {
      throw new Error("Resposta não-JSON recebida do servidor Xtream.");
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("Falha ao interpretar resposta JSON do servidor Xtream.");
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Tempo limite excedido ao contatar o servidor Xtream.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const xtream = {
  base,
  authenticate(creds: XtreamCredentials): string {
    // URL para autenticação — sem expor a senha
    return safeUrl(`${base(creds)}/player_api.php?${authParams(creds).toString()}`);
  },

  async getUserInfo(creds: XtreamCredentials): Promise<XtreamUserInfo> {
    return call<XtreamUserInfo>(creds);
  },

  async getLiveCategories(creds: XtreamCredentials): Promise<XtreamCategory[]> {
    return call<XtreamCategory[]>(creds, "get_live_categories");
  },
  async getVodCategories(creds: XtreamCredentials): Promise<XtreamCategory[]> {
    return call<XtreamCategory[]>(creds, "get_vod_categories");
  },
  async getSeriesCategories(creds: XtreamCredentials): Promise<XtreamCategory[]> {
    return call<XtreamCategory[]>(creds, "get_series_categories");
  },

  async getLiveStreams(creds: XtreamCredentials, categoryId?: string): Promise<XtreamStream[]> {
    const params = authParams(creds);
    params.set("action", "get_live_streams");
    if (categoryId) params.set("category_id", categoryId);
    return call<XtreamStream[]>(creds, `get_live_streams${categoryId ? `&category_id=${categoryId}` : ""}`);
  },
  async getVodStreams(creds: XtreamCredentials, categoryId?: string): Promise<XtreamStream[]> {
    return call<XtreamStream[]>(creds, `get_vod_streams${categoryId ? `&category_id=${categoryId}` : ""}`);
  },
  async getSeries(creds: XtreamCredentials, categoryId?: string): Promise<XtreamSeries[]> {
    return call<XtreamSeries[]>(creds, `get_series${categoryId ? `&category_id=${categoryId}` : ""}`);
  },

  async getVodInfo(creds: XtreamCredentials, vodId: string): Promise<XtreamVodInfo> {
    const params = authParams(creds);
    params.set("action", "get_vod_info");
    params.set("vod_id", vodId);
    const url = `${base(creds)}/player_api.php?${params.toString()}`;
    const res = await fetch(url);
    return res.json();
  },
  async getSeriesInfo(creds: XtreamCredentials, seriesId: string): Promise<XtreamSeriesInfo> {
    const params = authParams(creds);
    params.set("action", "get_series_info");
    params.set("series_id", seriesId);
    const url = `${base(creds)}/player_api.php?${params.toString()}`;
    const res = await fetch(url);
    return res.json();
  },

  streamUrl(creds: XtreamCredentials, type: "live" | "movie" | "series", id: string, ext: string = "m3u8"): string {
    const b = base(creds);
    const extParam = ext && ext.length ? `.${ext}` : "";
    if (type === "live") return `${b}/live/${creds.username}/${creds.password}/${id}${extParam}`;
    if (type === "movie") return `${b}/movie/${creds.username}/${creds.password}/${id}${extParam}`;
    return `${b}/series/${creds.username}/${creds.password}/${id}${extParam}`;
  },

  epgUrl(creds: XtreamCredentials): string {
    return `${base(creds)}/xmltv.php?${authParams(creds).toString()}`;
  },

  shortUrl(creds: XtreamCredentials): string {
    return base(creds).replace(/^https?:\/\//, "");
  },
};
