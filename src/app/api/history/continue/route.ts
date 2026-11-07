import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/history/continue?profileId=&limit=
// Retorna itens com progresso salvo que ainda não foram concluídos,
// ordenados por updatedAt desc.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const profileId = sp.get("profileId");
  const limit = Math.min(parseInt(sp.get("limit") || "20", 10), 100);
  if (!profileId) return NextResponse.json({ error: "profileId obrigatório." }, { status: 400 });

  const items = await db.playbackProgress.findMany({
    where: { profileId, completed: false, position: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { movie: true, episode: true, channel: true },
  });

  const result = items.map((p) => {
    let title = "Sem título";
    let poster: string | null = null;
    let backdrop: string | null = null;
    let seriesId: string | null = null;
    if (p.movie) {
      title = p.movie.title || p.movie.name;
      poster = p.movie.poster;
      backdrop = p.movie.backdrop;
    } else if (p.episode) {
      title = p.episode.title;
      poster = p.episode.poster;
    } else if (p.channel) {
      title = p.channel.name;
      poster = p.channel.logo;
    }
    return {
      itemType: p.itemType,
      itemId: p.itemId,
      title,
      poster,
      backdrop,
      position: p.position,
      duration: p.duration,
      completed: p.completed,
      updatedAt: p.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ items: result });
}
