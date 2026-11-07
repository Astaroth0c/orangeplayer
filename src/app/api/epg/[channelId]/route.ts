import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { EpgProgram } from "@/types";

// GET /api/epg/[channelId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  const entries = await db.epgEntry.findMany({
    where: { channelId },
    orderBy: { start: "asc" },
    take: 50,
  });

  const now = Date.now();
  const programs: EpgProgram[] = entries.map((e) => {
    const total = e.end.getTime() - e.start.getTime();
    const elapsed = now - e.start.getTime();
    const progress = Math.max(0, Math.min(1, elapsed / total));
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      category: e.category,
      progress,
    };
  });

  const currentIdx = programs.findIndex((p) => {
    const s = new Date(p.start).getTime();
    const en = new Date(p.end).getTime();
    return s <= now && en > now;
  });

  return NextResponse.json({
    programs,
    now: currentIdx >= 0 ? programs[currentIdx] : null,
    next: currentIdx >= 0 && programs[currentIdx + 1] ? programs[currentIdx + 1] : null,
  });
}
