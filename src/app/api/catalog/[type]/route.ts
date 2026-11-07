import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type {
  CatalogMovie,
  CatalogSeries,
  CatalogChannel,
  EpgProgram,
} from "@/types";

function now(offsetMin: number): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMin);
  return d;
}

function toEpg(e: any, progressOverride?: number): EpgProgram | null {
  if (!e) return null;
  const total = e.end.getTime() - e.start.getTime();
  const elapsed = Date.now() - e.start.getTime();
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? null,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    category: e.category ?? null,
    progress: progressOverride ?? Math.max(0, Math.min(1, elapsed / total)),
  };
}

// GET /api/catalog/[type]?category=&search=&limit=&offset=&sort=
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const sp = new URL(req.url).searchParams;
  const category = sp.get("category") || undefined;
  const search = sp.get("search") || undefined;
  const limit = Math.min(parseInt(sp.get("limit") || "200", 10), 500);
  const offset = parseInt(sp.get("offset") || "0", 10) || 0;
  const sort = sp.get("sort") || "recent";

  if (type === "movies") {
    const where: any = {};
    if (category) where.categoryId = category;
    if (search) where.name = { contains: search };

    const order: any =
      sort === "alpha"
        ? { title: "asc" }
        : sort === "year"
        ? { year: "desc" }
        : { addedAt: "desc" };

    const items = await db.movie.findMany({
      where,
      orderBy: order,
      take: limit,
      skip: offset,
      include: { category: true },
    });
    const dtos: CatalogMovie[] = items.map((m) => ({
      id: m.id,
      providerId: m.providerId,
      streamId: m.streamId,
      name: m.name,
      title: m.title,
      year: m.year,
      rating: m.rating,
      poster: m.poster,
      backdrop: m.backdrop,
      plot: m.plot,
      genre: m.genre,
      cast: m.cast,
      director: m.director,
      duration: m.duration,
      streamUrl: m.streamUrl,
      categoryId: m.categoryId,
      categoryName: m.category?.name ?? null,
    }));
    return NextResponse.json({ items: dtos, total: dtos.length });
  }

  if (type === "series") {
    const where: any = {};
    if (category) where.categoryId = category;
    if (search) where.name = { contains: search };
    const order: any =
      sort === "alpha"
        ? { title: "asc" }
        : sort === "year"
        ? { year: "desc" }
        : { addedAt: "desc" };

    const items = await db.series.findMany({
      where,
      orderBy: order,
      take: limit,
      skip: offset,
      include: {
        category: true,
        seasons: {
          orderBy: { seasonNumber: "asc" },
          include: { episodes: { orderBy: { episodeNum: "asc" } } },
        },
      },
    });
    const dtos: CatalogSeries[] = items.map((s) => ({
      id: s.id,
      providerId: s.providerId,
      seriesId: s.seriesId,
      name: s.name,
      title: s.title,
      year: s.year,
      rating: s.rating,
      poster: s.poster,
      backdrop: s.backdrop,
      plot: s.plot,
      genre: s.genre,
      cast: s.cast,
      categoryId: s.categoryId,
      categoryName: s.category?.name ?? null,
      seasons: s.seasons.map((sn) => ({
        id: sn.id,
        seasonNumber: sn.seasonNumber,
        name: sn.name,
        poster: sn.poster,
        overview: sn.overview,
        episodes: sn.episodes.map((e) => ({
          id: e.id,
          episodeNum: e.episodeNum,
          title: e.title,
          overview: e.overview,
          duration: e.duration,
          streamUrl: e.streamUrl,
          poster: e.poster,
          airDate: e.airDate,
        })),
      })),
    }));
    return NextResponse.json({ items: dtos, total: dtos.length });
  }

  if (type === "live") {
    const where: any = {};
    if (category) where.categoryId = category;
    if (search) where.name = { contains: search };

    const items = await db.channel.findMany({
      where,
      orderBy: [{ num: "asc" }, { name: "asc" }],
      take: limit,
      skip: offset,
      include: { category: true, epgEntries: { orderBy: { start: "asc" } } },
    });

    const nowTime = Date.now();
    const dtos: CatalogChannel[] = items.map((c) => {
      const sorted = [...c.epgEntries].sort((a, b) => a.start.getTime() - b.start.getTime());
      const currentIdx = sorted.findIndex((e) => e.start.getTime() <= nowTime && e.end.getTime() > nowTime);
      const now = currentIdx >= 0 ? sorted[currentIdx] : null;
      const next = currentIdx >= 0 && sorted[currentIdx + 1] ? sorted[currentIdx + 1] : null;
      return {
        id: c.id,
        providerId: c.providerId,
        channelId: c.channelId,
        name: c.name,
        logo: c.logo,
        streamUrl: c.streamUrl,
        num: c.num,
        categoryId: c.categoryId,
        categoryName: c.category?.name ?? null,
        epgId: c.epgId,
        nowPlaying: toEpg(now),
        nextPlaying: toEpg(next),
      };
    });
    return NextResponse.json({ items: dtos, total: dtos.length });
  }

  if (type === "categories") {
    const cats = await db.category.findMany({ orderBy: { name: "asc" } });
    const groups = cats.reduce((acc: any, c) => {
      const key = c.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push({ id: c.id, categoryId: c.categoryId, name: c.name, type: c.type });
      return acc;
    }, {});
    return NextResponse.json({ groups });
  }

  return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
}
