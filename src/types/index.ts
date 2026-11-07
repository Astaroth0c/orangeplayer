// ===========================================================
// ORANGE Player — Tipos compartilhados
// ===========================================================

export type ProviderType = "xtream" | "m3u" | "demo";

export type ItemType = "movie" | "series" | "channel" | "episode";

export type ScreenView =
  | "splash"
  | "onboarding"
  | "login"
  | "profile-select"
  | "home"
  | "movies"
  | "series"
  | "live"
  | "search"
  | "favorites"
  | "history"
  | "settings"
  | "profiles"
  | "providers"
  | "movie-detail"
  | "series-detail"
  | "channel-detail";

// Catálogo
export interface CatalogMovie {
  id: string;
  providerId: string;
  streamId: string;
  name: string;
  title: string;
  year?: number | null;
  rating?: number | null;
  poster?: string | null;
  backdrop?: string | null;
  plot?: string | null;
  genre?: string | null;
  cast?: string | null;
  director?: string | null;
  duration?: number | null;
  streamUrl: string;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface CatalogSeries {
  id: string;
  providerId: string;
  seriesId: string;
  name: string;
  title: string;
  year?: number | null;
  rating?: number | null;
  poster?: string | null;
  backdrop?: string | null;
  plot?: string | null;
  genre?: string | null;
  cast?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  seasons: CatalogSeason[];
}

export interface CatalogSeason {
  id: string;
  seasonNumber: number;
  name?: string | null;
  poster?: string | null;
  overview?: string | null;
  episodes: CatalogEpisode[];
}

export interface CatalogEpisode {
  id: string;
  episodeNum: number;
  title: string;
  overview?: string | null;
  duration?: number | null;
  streamUrl: string;
  poster?: string | null;
  airDate?: string | null;
}

export interface CatalogChannel {
  id: string;
  providerId: string;
  channelId: string;
  name: string;
  logo?: string | null;
  streamUrl: string;
  num?: number | null;
  categoryId?: string | null;
  categoryName?: string | null;
  epgId?: string | null;
  nowPlaying?: EpgProgram | null;
  nextPlaying?: EpgProgram | null;
}

export interface EpgProgram {
  id: string;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  category?: string | null;
  progress?: number; // 0..1
}

export interface CategoryGroup {
  id: string;
  categoryId: string;
  name: string;
  type: "movie" | "series" | "live";
  count: number;
}

// Perfil
export interface ProfileDTO {
  id: string;
  name: string;
  avatar?: string | null;
  isKid: boolean;
  isDefault: boolean;
  hasPin: boolean;
}

// Provider
export interface ProviderDTO {
  id: string;
  name: string;
  type: ProviderType;
  serverUrl: string;
  username?: string | null;
  m3uUrl?: string | null;
  status: string;
  lastSyncAt?: string | null;
  lastError?: string | null;
  itemCount: number;
  createdAt: string;
}

export interface CreateProviderInput {
  name: string;
  type: ProviderType;
  serverUrl?: string;
  username?: string;
  password?: string;
  m3uUrl?: string;
  profileId?: string;
}

// Player
export interface PlayerItem {
  kind: "movie" | "episode" | "channel";
  id: string;
  title: string;
  subtitle?: string;
  streamUrl: string;
  poster?: string;
  backdrop?: string;
  duration?: number;
  // Para series — próxima episodio
  nextEpisode?: {
    id: string;
    title: string;
    streamUrl: string;
    season: number;
    episode: number;
  } | null;
  // Identificação para progresso
  seriesId?: string;
  episodeId?: string;
}

// Favoritos e progresso
export interface FavoriteDTO {
  id: string;
  itemType: ItemType;
  itemId: string;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  createdAt: string;
}

export interface ProgressDTO {
  itemType: ItemType;
  itemId: string;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
}

export interface HistoryDTO {
  id: string;
  itemType: ItemType;
  itemId: string;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  watchedAt: string;
  duration: number;
  position: number;
  completed: boolean;
}

export interface SearchResult {
  movies: CatalogMovie[];
  series: CatalogSeries[];
  channels: CatalogChannel[];
}
