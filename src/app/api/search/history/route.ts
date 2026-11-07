import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/search/history?profileId=
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const profileId = sp.get("profileId");
  if (!profileId) return NextResponse.json({ history: [] });
  const items = await db.searchHistory.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const seen = new Set<string>();
  const history = items
    .map((h) => h.query)
    .filter((q) => {
      if (seen.has(q)) return false;
      seen.add(q);
      return true;
    });
  return NextResponse.json({ history });
}

export async function DELETE(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const profileId = sp.get("profileId");
  const query = sp.get("query");
  if (!profileId) return NextResponse.json({ error: "profileId obrigatório." }, { status: 400 });
  if (query) {
    await db.searchHistory.deleteMany({ where: { profileId, query } });
  } else {
    await db.searchHistory.deleteMany({ where: { profileId } });
  }
  return NextResponse.json({ ok: true });
}
