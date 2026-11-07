import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { HistoryDTO, ItemType, ProgressDTO } from "@/types";

// GET /api/history?profileId=&limit=
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const profileId = sp.get("profileId");
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10), 200);
  if (!profileId) return NextResponse.json({ error: "profileId obrigatório." }, { status: 400 });

  const items = await db.watchHistory.findMany({
    where: { profileId },
    orderBy: { watchedAt: "desc" },
    take: limit,
    include: { movie: true, series: true, channel: true, episode: true },
  });

  const dtos: HistoryDTO[] = items.map((h) => {
    let title = h.title;
    let poster = h.poster;
    let backdrop = h.backdrop;
    if (h.movie) { title = h.movie.title || h.movie.name; poster = h.movie.poster; backdrop = h.movie.backdrop; }
    else if (h.series) { title = h.series.title || h.series.name; poster = h.series.poster; backdrop = h.series.backdrop; }
    else if (h.channel) { title = h.channel.name; poster = h.channel.logo; }
    return {
      id: h.id,
      itemType: h.itemType as ItemType,
      itemId: h.itemId,
      title: title || "Sem título",
      poster,
      backdrop,
      watchedAt: h.watchedAt.toISOString(),
      duration: h.duration,
      position: 0,
      completed: false,
    };
  });

  return NextResponse.json({ history: dtos });
}

// POST /api/history
// Body: { profileId, itemType, itemId, title, poster, backdrop, duration, position, completed }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profileId, itemType, itemId, title, poster, backdrop, duration, position, completed } = body;
    if (!profileId || !itemType || !itemId) {
      return NextResponse.json({ error: "Parâmetros obrigatórios." }, { status: 400 });
    }

    // Atualiza progresso
    await db.playbackProgress.upsert({
      where: { profileId_itemType_itemId: { profileId, itemType, itemId } },
      create: {
        profileId, itemType, itemId,
        position: Math.max(0, Math.floor(position ?? 0)),
        duration: Math.max(0, Math.floor(duration ?? 0)),
        completed: !!completed,
      },
      update: {
        position: Math.max(0, Math.floor(position ?? 0)),
        duration: Math.max(0, Math.floor(duration ?? 0)),
        completed: !!completed,
      },
    });

    // Atualiza histórico (somente se uma janela de tempo passou desde o último)
    const existing = await db.watchHistory.findFirst({
      where: { profileId, itemType, itemId },
      orderBy: { watchedAt: "desc" },
    });
    const window = 60_000; // 1 min
    if (!existing || Date.now() - existing.watchedAt.getTime() > window) {
      const data: any = {
        profileId, itemType, itemId,
        title: title || "Sem título",
        poster, backdrop,
        duration: Math.max(0, Math.floor(duration ?? 0)),
      };
      if (itemType === "movie") data.movieId = itemId;
      if (itemType === "series") data.seriesId = itemId;
      if (itemType === "channel") data.channelId = itemId;
      if (itemType === "episode" && body.episodeId) data.episodeId = body.episodeId;
      await db.watchHistory.create({ data });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[history] POST erro:", err);
    return NextResponse.json({ error: "Erro ao salvar histórico." }, { status: 500 });
  }
}

// GET /api/history/progress?profileId=&itemType=&itemId=
export async function getProgress(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const profileId = sp.get("profileId");
  const itemType = sp.get("itemType");
  const itemId = sp.get("itemId");
  if (!profileId || !itemType || !itemId) {
    return NextResponse.json({ error: "Parâmetros obrigatórios." }, { status: 400 });
  }
  const p = await db.playbackProgress.findUnique({
    where: { profileId_itemType_itemId: { profileId, itemType: itemType as any, itemId } },
  });
  if (!p) return NextResponse.json({ progress: null });
  const dto: ProgressDTO = {
    itemType: p.itemType as ItemType,
    itemId: p.itemId,
    position: p.position,
    duration: p.duration,
    completed: p.completed,
    updatedAt: p.updatedAt.toISOString(),
  };
  return NextResponse.json({ progress: dto });
}
