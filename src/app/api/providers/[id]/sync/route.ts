import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseM3U, classifyM3UEntry, parseSeriesEpisodeInfo } from "@/lib/m3u-parser";
import { xtream } from "@/lib/xtream";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const provider = await db.provider.findUnique({ where: { id } });
    if (!provider) {
      return NextResponse.json({ error: "Provedor não encontrado." }, { status: 404 });
    }

    await db.provider.update({ where: { id }, data: { status: "syncing", lastError: null } });

    let count = 0;
    if (provider.type === "m3u" && provider.m3uUrl) {
      count = await syncM3U(provider);
    } else if (provider.type === "xtream" && provider.username && provider.password) {
      count = await syncXtream(provider);
    } else if (provider.type === "demo") {
      count = await db.provider.findUnique({ where: { id } }).then((p) => p?.itemCount ?? 0);
    } else {
      return NextResponse.json(
        { error: "Configuração incompleta para sincronização." },
        { status: 400 },
      );
    }

    await db.provider.update({
      where: { id },
      data: {
        status: "ready",
        lastSyncAt: new Date(),
        itemCount: count,
      },
    });

    return NextResponse.json({ ok: true, itemCount: count });
  } catch (err) {
    console.error("[sync] erro:", err);
    const { id } = await params;
    await db.provider.update({
      where: { id },
      data: {
        status: "error",
        lastError: err instanceof Error ? err.message : "Erro desconhecido",
      },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao sincronizar." },
      { status: 500 },
    );
  }
}

async function syncM3U(provider: any): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let text: string;
  try {
    const res = await fetch(provider.m3uUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "ORANGE-Player/1.0" },
    });
    if (!res.ok) throw new Error(`Resposta ${res.status} ao buscar a lista M3U.`);
    text = await res.text();
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Tempo limite excedido ao buscar a lista M3U.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const { entries, errors } = parseM3U(text);
  if (entries.length === 0) {
    throw new Error(`Nenhuma entrada encontrada no M3U. ${errors.join(" ")}`);
  }

  let count = 0;
  for (const entry of entries) {
    const kind = classifyM3UEntry(entry);
    const categoryName = entry.group ?? "Sem categoria";
    const categoryId = slugify(categoryName);

    let category = await db.category.findFirst({
      where: { providerId: provider.id, categoryId, type: kind === "live" ? "live" : kind === "series" ? "series" : "movie" },
    });
    if (!category) {
      category = await db.category.create({
        data: {
          providerId: provider.id,
          categoryId,
          name: categoryName,
          type: kind === "live" ? "live" : kind === "series" ? "series" : "movie",
        },
      });
    }

    if (kind === "live") {
      const exists = await db.channel.findFirst({
        where: { providerId: provider.id, streamUrl: entry.streamUrl },
      });
      if (!exists) {
        await db.channel.create({
          data: {
            providerId: provider.id,
            channelId: `live-${count}`,
            name: entry.name,
            logo: entry.logo ?? null,
            streamUrl: entry.streamUrl,
            categoryId: category.id,
            num: count + 1,
          },
        });
        count++;
      }
    } else if (kind === "movie") {
      const exists = await db.movie.findFirst({
        where: { providerId: provider.id, streamUrl: entry.streamUrl },
      });
      if (!exists) {
        await db.movie.create({
          data: {
            providerId: provider.id,
            streamId: `vod-${count}`,
            name: entry.name,
            title: entry.name,
            poster: entry.logo ?? null,
            streamUrl: entry.streamUrl,
            categoryId: category.id,
          },
        });
        count++;
      }
    } else {
      const info = parseSeriesEpisodeInfo(entry.name);
      const showName = info.show || entry.name;
      let series = await db.series.findFirst({
        where: { providerId: provider.id, name: showName },
      });
      if (!series) {
        series = await db.series.create({
          data: {
            providerId: provider.id,
            seriesId: `series-${slugify(showName)}`,
            name: showName,
            title: showName,
            poster: entry.logo ?? null,
            categoryId: category.id,
          },
        });
        count++;
      }
      const seasonNumber = info.season ?? 1;
      const episodeNum = info.episode ?? 1;
      let season = await db.season.findFirst({
        where: { seriesId: series.id, seasonNumber },
      });
      if (!season) {
        season = await db.season.create({
          data: { seriesId: series.id, seasonNumber, name: `Temporada ${seasonNumber}` },
        });
      }
      const epExists = await db.episode.findFirst({
        where: { seasonId: season.id, episodeNum },
      });
      if (!epExists) {
        await db.episode.create({
          data: {
            seasonId: season.id,
            episodeNum,
            title: entry.name,
            streamUrl: entry.streamUrl,
            poster: entry.logo ?? null,
          },
        });
      }
    }
  }

  return count;
}

async function syncXtream(provider: any): Promise<number> {
  const creds = {
    serverUrl: provider.serverUrl,
    username: provider.username,
    password: provider.password,
  };

  const info = await xtream.getUserInfo(creds);
  if (info.user_info && info.user_info.auth === 0) {
    throw new Error("Credenciais Xtream inválidas.");
  }

  let count = 0;

  try {
    const liveCats = await xtream.getLiveCategories(creds);
    for (const cat of liveCats.slice(0, 50)) {
      let dbCat = await db.category.findFirst({
        where: { providerId: provider.id, categoryId: cat.category_id, type: "live" },
      });
      if (!dbCat) {
        dbCat = await db.category.create({
          data: { providerId: provider.id, categoryId: cat.category_id, name: cat.category_name, type: "live" },
        });
      }
      const streams = await xtream.getLiveStreams(creds, cat.category_id);
      for (const s of streams.slice(0, 200)) {
        if (!s.stream_id) continue;
        const exists = await db.channel.findFirst({
          where: { providerId: provider.id, channelId: String(s.stream_id) },
        });
        if (!exists) {
          await db.channel.create({
            data: {
              providerId: provider.id,
              channelId: String(s.stream_id),
              name: s.name ?? "Canal sem nome",
              logo: s.stream_icon ?? null,
              streamUrl: xtream.streamUrl(creds, "live", String(s.stream_id)),
              epgId: s.epg_channel_id ?? null,
              num: s.num ?? null,
              categoryId: dbCat.id,
            },
          });
          count++;
        }
      }
    }
  } catch (err) {
    console.warn("[sync/xtream] live erro:", err);
  }

  try {
    const vodCats = await xtream.getVodCategories(creds);
    for (const cat of vodCats.slice(0, 50)) {
      let dbCat = await db.category.findFirst({
        where: { providerId: provider.id, categoryId: cat.category_id, type: "movie" },
      });
      if (!dbCat) {
        dbCat = await db.category.create({
          data: { providerId: provider.id, categoryId: cat.category_id, name: cat.category_name, type: "movie" },
        });
      }
      const streams = await xtream.getVodStreams(creds, cat.category_id);
      for (const s of streams.slice(0, 200)) {
        if (!s.stream_id) continue;
        const exists = await db.movie.findFirst({
          where: { providerId: provider.id, streamId: String(s.stream_id) },
        });
        if (!exists) {
          await db.movie.create({
            data: {
              providerId: provider.id,
              streamId: String(s.stream_id),
              name: s.name ?? "Filme sem nome",
              title: s.title ?? s.name ?? "Filme",
              year: s.year ? parseInt(s.year, 10) : null,
              rating: s.rating_5based ?? null,
              poster: s.stream_icon ?? null,
              streamUrl: xtream.streamUrl(creds, "movie", String(s.stream_id), s.container_extension ?? "mp4"),
              categoryId: dbCat.id,
            },
          });
          count++;
        }
      }
    }
  } catch (err) {
    console.warn("[sync/xtream] vod erro:", err);
  }

  try {
    const seriesCats = await xtream.getSeriesCategories(creds);
    for (const cat of seriesCats.slice(0, 30)) {
      let dbCat = await db.category.findFirst({
        where: { providerId: provider.id, categoryId: cat.category_id, type: "series" },
      });
      if (!dbCat) {
        dbCat = await db.category.create({
          data: { providerId: provider.id, categoryId: cat.category_id, name: cat.category_name, type: "series" },
        });
      }
      const series = await xtream.getSeries(creds, cat.category_id);
      for (const s of series.slice(0, 100)) {
        if (!s.series_id) continue;
        const exists = await db.series.findFirst({
          where: { providerId: provider.id, seriesId: String(s.series_id) },
        });
        if (!exists) {
          await db.series.create({
            data: {
              providerId: provider.id,
              seriesId: String(s.series_id),
              name: s.name ?? "Série sem nome",
              title: s.title ?? s.name ?? "Série",
              year: s.year ? parseInt(s.year, 10) : null,
              rating: s.rating_5based ?? null,
              poster: s.cover ?? null,
              plot: s.plot ?? null,
              cast: s.cast ?? null,
              director: s.director ?? null,
              genre: s.genre ?? null,
              categoryId: dbCat.id,
            },
          });
          count++;
        }
      }
    }
  } catch (err) {
    console.warn("[sync/xtream] series erro:", err);
  }

  return count;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
