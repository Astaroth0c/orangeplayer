import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ProviderDTO, CreateProviderInput, ProviderType } from "@/types";

function toDTO(p: any): ProviderDTO {
  return {
    id: p.id,
    name: p.name,
    type: p.type as ProviderType,
    serverUrl: p.serverUrl,
    username: p.username ?? null,
    m3uUrl: p.m3uUrl ?? null,
    status: p.status,
    lastSyncAt: p.lastSyncAt?.toISOString() ?? null,
    lastError: p.lastError ?? null,
    itemCount: p.itemCount,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function GET() {
  const providers = await db.provider.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ providers: providers.map(toDTO) });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateProviderInput;
    if (!body.name) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });

    if (body.type === "xtream") {
      if (!body.serverUrl || !body.username || !body.password) {
        return NextResponse.json(
          { error: "Xtream exige URL, usuário e senha." },
          { status: 400 },
        );
      }
    } else if (body.type === "m3u") {
      if (!body.m3uUrl) {
        return NextResponse.json({ error: "URL M3U é obrigatória." }, { status: 400 });
      }
    } else if (body.type !== "demo") {
      return NextResponse.json({ error: "Tipo de provedor inválido." }, { status: 400 });
    }

    const provider = await db.provider.create({
      data: {
        name: body.name.trim().slice(0, 120),
        type: body.type,
        serverUrl: body.serverUrl ?? "",
        username: body.username ?? null,
        password: body.password ?? null,
        m3uUrl: body.m3uUrl ?? null,
        profileId: body.profileId ?? null,
        status: "idle",
      },
    });

    return NextResponse.json({ provider: toDTO(provider) });
  } catch (err) {
    console.error("[providers] POST erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao criar provedor." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    const provider = await db.provider.findUnique({ where: { id } });
    if (!provider) return NextResponse.json({ error: "Provedor não encontrado." }, { status: 404 });
    // Cascata: Prisma já cuida via onDelete: Cascade nas relações
    await db.provider.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[providers] DELETE erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao excluir provedor." },
      { status: 500 },
    );
  }
}
