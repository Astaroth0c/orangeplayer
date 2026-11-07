import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PlayerItem } from "@/types";

// GET /api/item/[type]/[id]?profileId=
// type: movie | episode | channel
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;
  const sp = new URL(req.url).searchParams;
  const profileId = sp.get("profileId") || undefined;

  if (type === "movie") {
    const m = await db.movie.findUnique({ where: { id } });
    if (!m) return NextResponse.json({ error: "Filme não encontrado." }, { status: 404 });

    let progress = null;
    if (profileId) {
      const p = await db.playbackProgress.findUnique({
        where: profileId
          ? { profileId_itemType_itemId: { profileId, itemType: "movie", itemId: id } }
          : undefined as any,
      });
      if (p) {
        progress = { position: p.position, duration: p.duration, completed: p.completed };
      }
    }
    const item: PlayerItem = {
      kind: "movie",
      id: m.id,
      title: m.title || m.name,
      streamUrl: m.streamUrl,
      poster: m.poster ?? undefined,
      backdrop: m.backdrop ?? undefined,
      duration: m.duration ?? undefined,
      seriesId: undefined,
      episodeId: undefined,
      nextEpisode: null,
    };
    return NextResponse.json({ item, progress });
  }

  if (type === "channel") {
    const c = await db.channel.findUnique({ where: { id } });
    if (!c) return NextResponse.json({ error: "Canal não encontrado." }, { status: 404 });
    const item: PlayerItem = {
      kind: "channel",
      id: c.id,
      title: c.name,
      streamUrl: c.streamUrl,
      poster: c.logo ?? undefined,
      backdrop: undefined,
      duration: undefined,
      nextEpisode: null,
    };
    return NextResponse.json({ item, progress: null });
  }

  if (type === "episode") {
    const ep = await db.episode.findUnique({
      where: { id },
      include: { season: { include: { series: true, episodes: { orderBy: { episodeNum: "asc" } } } } },
    });
    if (!ep) return NextResponse.json({ error: "Episódio não encontrado." }, { status: 404 });

    // próximo episódio: mesmo season, próximo número; se não houver, primeira ep da próxima season
    let nextEpisode: PlayerItem["nextEpisode"] = null;
    const siblings = ep.season.episodes;
    const idx = siblings.findIndex((e) => e.id === ep.id);
    if (idx >= 0 && idx + 1 < siblings.length) {
      const n = siblings[idx + 1];
      nextEpisode = {
        id: n.id,
        title: n.title,
        streamUrl: n.streamUrl,
        season: ep.season.seasonNumber,
        episode: n.episodeNum,
      };
    } else {
      // próxima temporada
      const series = await db.series.findUnique({
        where: { id: ep.season.seriesId },
        include: {
          seasons: {
            orderBy: { seasonNumber: "asc" },
            include: { episodes: { orderBy: { episodeNum: "asc" } } },
          },
        },
      });
      if (series) {
        const seasonIdx = series.seasons.findIndex((s) => s.id === ep.seasonId);
        if (seasonIdx >= 0 && seasonIdx + 1 < series.seasons.length) {
          const nextSeason = series.seasons[seasonIdx + 1];
          const firstEp = nextSeason.episodes[0];
          if (firstEp) {
            nextEpisode = {
              id: firstEp.id,
              title: firstEp.title,
              streamUrl: firstEp.streamUrl,
              season: nextSeason.seasonNumber,
              episode: firstEp.episodeNum,
            };
          }
        }
      }
    }

    let progress = null;
    if (profileId) {
      const p = await db.playbackProgress.findUnique({
        where: { profileId_itemType_itemId: { profileId, itemType: "episode", itemId: id } },
      });
      if (p) progress = { position: p.position, duration: p.duration, completed: p.completed };
    }

    const item: PlayerItem = {
      kind: "episode",
      id: ep.id,
      title: ep.title,
      subtitle: `${ep.season.series.title || ep.season.series.name} • T${ep.season.seasonNumber}E${ep.episodeNum}`,
      streamUrl: ep.streamUrl,
      poster: ep.poster ?? ep.season.series.poster ?? undefined,
      backdrop: ep.season.series.backdrop ?? undefined,
      duration: ep.duration ?? undefined,
      seriesId: ep.season.seriesId,
      episodeId: ep.id,
      nextEpisode,
    };
    return NextResponse.json({ item, progress });
  }

  return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
}
