import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { FavoriteDTO, ItemType } from "@/types";

// GET /api/favorites?profileId=&type=
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const profileId = sp.get("profileId");
  const type = sp.get("type") as ItemType | null;
  if (!profileId) return NextResponse.json({ error: "profileId obrigatório." }, { status: 400 });

  const where: any = { profileId };
  if (type) where.itemType = type;
  const favs = await db.favorite.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { movie: true, series: true, channel: true },
  });

  const dtos: FavoriteDTO[] = favs.map((f) => {
    let title = f.title || "Sem título";
    let poster: string | null = null;
    let backdrop: string | null = null;
    if (f.movie) {
      title = f.movie.title || f.movie.name;
      poster = f.movie.poster;
      backdrop = f.movie.backdrop;
    } else if (f.series) {
      title = f.series.title || f.series.name;
      poster = f.series.poster;
      backdrop = f.series.backdrop;
    } else if (f.channel) {
      title = f.channel.name;
      poster = f.channel.logo;
    }
    return {
      id: f.id,
      itemType: f.itemType as ItemType,
      itemId: f.itemId,
      title,
      poster,
      backdrop,
      createdAt: f.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ favorites: dtos });
}

// POST /api/favorites { profileId, itemType, itemId }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profileId, itemType, itemId } = body;
    if (!profileId || !itemType || !itemId) {
      return NextResponse.json({ error: "Parâmetros obrigatórios." }, { status: 400 });
    }

    const existing = await db.favorite.findUnique({
      where: {
        profileId_itemType_itemId: { profileId, itemType, itemId },
      },
    });
    if (existing) {
      return NextResponse.json({ ok: true, exists: true });
    }

    const data: any = { profileId, itemType, itemId };
    if (itemType === "movie") data.movieId = itemId;
    if (itemType === "series") data.seriesId = itemId;
    if (itemType === "channel") data.channelId = itemId;

    await db.favorite.create({ data });
    return NextResponse.json({ ok: true, exists: false });
  } catch (err) {
    console.error("[favorites] POST erro:", err);
    return NextResponse.json({ error: "Erro ao favoritar." }, { status: 500 });
  }
}

// DELETE /api/favorites?profileId=&itemType=&itemId=
export async function DELETE(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const profileId = sp.get("profileId");
    const itemType = sp.get("itemType");
    const itemId = sp.get("itemId");
    if (!profileId || !itemType || !itemId) {
      return NextResponse.json({ error: "Parâmetros obrigatórios." }, { status: 400 });
    }
    await db.favorite.deleteMany({
      where: { profileId, itemType, itemId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[favorites] DELETE erro:", err);
    return NextResponse.json({ error: "Erro ao remover favorito." }, { status: 500 });
  }
}
