import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/settings?profileId=
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const profileId = sp.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profileId obrigatório." }, { status: 400 });

  let settings = await db.appSettings.findUnique({ where: { profileId } });
  if (!settings) {
    settings = await db.appSettings.create({ data: { profileId } });
  }
  return NextResponse.json({ settings });
}

// PATCH /api/settings { profileId, ...fields }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { profileId, ...fields } = body;
    if (!profileId) return NextResponse.json({ error: "profileId obrigatório." }, { status: 400 });

    const allowed: Record<string, boolean> = {
      theme: true, uiDensity: true, posterSize: true, reduceMotion: true,
      autoplayNext: true, skipIntro: true, defaultSpeed: true, hwAccel: true, bufferProfile: true,
      subtitleEnabled: true, subtitleLang: true, subtitleSize: true, subtitleColor: true, subtitleBg: true,
      audioLang: true,
      parentalControl: true, maxRating: true,
      syncEnabled: true,
    };
    const data: any = {};
    for (const [k, v] of Object.entries(fields)) {
      if (allowed[k]) data[k] = v;
    }

    const settings = await db.appSettings.upsert({
      where: { profileId },
      create: { profileId, ...data },
      update: data,
    });
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[settings] PATCH erro:", err);
    return NextResponse.json({ error: "Erro ao salvar configurações." }, { status: 500 });
  }
}
