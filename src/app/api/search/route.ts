import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/search?q=&limit=
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").trim();
  const limit = Math.min(parseInt(sp.get("limit") || "30", 10), 100);
  if (q.length < 2) return NextResponse.json({ movies: [], series: [], channels: [] });

  const [movies, series, channels] = await Promise.all([
    db.movie.findMany({
      where: { name: { contains: q } },
      take: limit,
      orderBy: { addedAt: "desc" },
      include: { category: true },
    }),
    db.series.findMany({
      where: { name: { contains: q } },
      take: limit,
      orderBy: { addedAt: "desc" },
      include: { category: true },
    }),
    db.channel.findMany({
      where: { name: { contains: q } },
      take: limit,
      orderBy: [{ num: "asc" }, { name: "asc" }],
      include: { category: true },
    }),
  ]);

  return NextResponse.json({
    movies: movies.map((m) => ({
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
      duration: m.duration,
      streamUrl: m.streamUrl,
      categoryName: m.category?.name ?? null,
    })),
    series: series.map((s) => ({
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
      categoryName: s.category?.name ?? null,
      seasons: [],
    })),
    channels: channels.map((c) => ({
      id: c.id,
      providerId: c.providerId,
      channelId: c.channelId,
      name: c.name,
      logo: c.logo,
      streamUrl: c.streamUrl,
      num: c.num,
      categoryName: c.category?.name ?? null,
    })),
  });
}

// GET /api/search/history?profileId=
// POST /api/search/history { profileId, query }
// DELETE /api/search/history?profileId=&query=

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profileId, query } = body;
    if (!profileId || !query) return NextResponse.json({ ok: true });
    await db.searchHistory.create({
      data: { profileId, query: query.slice(0, 120) },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
