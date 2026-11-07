import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ProfileDTO } from "@/types";

export async function GET() {
  const profiles = await db.profile.findMany({ orderBy: { createdAt: "asc" } });
  const dtos: ProfileDTO[] = profiles.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    isKid: p.isKid,
    isDefault: p.isDefault,
    hasPin: !!p.pin,
  }));
  return NextResponse.json({ profiles: dtos });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, avatar, isKid, isDefault, pin } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }
    if (isDefault) {
      await db.profile.updateMany({ data: { isDefault: false } });
    }
    const profile = await db.profile.create({
      data: {
        name: name.trim().slice(0, 60),
        avatar: avatar ?? null,
        isKid: !!isKid,
        isDefault: !!isDefault,
        pin: pin ?? null,
      },
    });
    await db.appSettings.create({ data: { profileId: profile.id } });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[profiles] POST erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao criar perfil." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, avatar, isKid, isDefault, pin, clearPin } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    const profile = await db.profile.findUnique({ where: { id } });
    if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    if (isDefault) {
      await db.profile.updateMany({ data: { isDefault: false } });
    }
    const updated = await db.profile.update({
      where: { id },
      data: {
        name: name?.trim().slice(0, 60) ?? undefined,
        avatar: avatar ?? undefined,
        isKid: typeof isKid === "boolean" ? isKid : undefined,
        isDefault: typeof isDefault === "boolean" ? isDefault : undefined,
        pin: clearPin ? null : pin ?? undefined,
      },
    });
    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error("[profiles] PATCH erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar perfil." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    const profile = await db.profile.findUnique({ where: { id } });
    if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    if (profile.isDefault) {
      return NextResponse.json(
        { error: "Não é possível excluir o perfil padrão." },
        { status: 400 },
      );
    }
    await db.profile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profiles] DELETE erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao excluir perfil." },
      { status: 500 },
    );
  }
}
