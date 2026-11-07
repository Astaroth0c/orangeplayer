import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/history/progress?profileId=&itemType=&itemId=
export async function GET(req: NextRequest) {
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
  return NextResponse.json({
    progress: {
      itemType: p.itemType,
      itemId: p.itemId,
      position: p.position,
      duration: p.duration,
      completed: p.completed,
      updatedAt: p.updatedAt.toISOString(),
    },
  });
}
