// ===========================================================
// SEED — Inicializa o banco com o catálogo demo + perfil padrão
// ===========================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  DEMO_MOVIES,
  DEMO_SERIES,
  DEMO_CHANNELS,
  DEMO_CATEGORIES,
  DEMO_EPG,
} from "@/data/demo-catalog";

export async function POST(_req: NextRequest) {
  try {
    // 1. Perfil padrão
    let profile = await db.profile.findFirst({ where: { isDefault: true } });
    if (!profile) {
      profile = await db.profile.create({
        data: {
          name: "Perfil Principal",
          isDefault: true,
          avatar: null,
          isKid: false,
        },
      });
    }

    // Settings do perfil
    await db.appSettings.upsert({
      where: { profileId: profile.id },
      create: { profileId: profile.id },
      update: {},
    });

    // 2. Provider demo
    let demoProvider = await db.provider.findFirst({
      where: { type: "demo" },
    });
    if (!demoProvider) {
      demoProvider = await db.provider.create({
        data: {
          name: "ORANGE Demo",
          type: "demo",
          serverUrl: "internal://demo",
          status: "ready",
          itemCount: 0,
          lastSyncAt: new Date(),
        },
      });
    }

    // 3. Categorias
    const catMap: Record<string, string> = {};
    for (const [type, cats] of Object.entries(DEMO_CATEGORIES)) {
      for (const c of cats) {
        const existing = await db.category.findFirst({
          where: { providerId: demoProvider.id, categoryId: c.id, type },
        });
        if (!existing) {
          const created = await db.category.create({
            data: {
              providerId: demoProvider.id,
              categoryId: c.id,
              name: c.name,
              type,
            },
          });
          catMap[`${type}-${c.id}`] = created.id;
        } else {
          catMap[`${type}-${c.id}`] = existing.id;
        }
      }
    }

    // 4. Filmes (upsert — atualiza streamUrl se mudar)
    for (const m of DEMO_MOVIES) {
      const categoryId = m.categoryId ? catMap[`movie-${m.categoryId}`] : null;
      const existing = await db.movie.findFirst({
        where: { providerId: demoProvider.id, streamId: m.streamId },
      });
      if (existing) {
        await db.movie.update({
          where: { id: existing.id },
          data: {
            name: m.name,
            title: m.title,
            year: m.year ?? null,
            rating: m.rating ?? null,
            poster: m.poster ?? null,
            backdrop: m.backdrop ?? null,
            plot: m.plot ?? null,
            genre: m.genre ?? null,
            cast: m.cast ?? null,
            director: m.director ?? null,
            duration: m.duration ?? null,
            streamUrl: m.streamUrl,
            categoryId,
          },
        });
        continue;
      }
      await db.movie.create({
        data: {
          providerId: demoProvider.id,
          streamId: m.streamId,
          name: m.name,
          title: m.title,
          year: m.year ?? null,
          rating: m.rating ?? null,
          poster: m.poster ?? null,
          backdrop: m.backdrop ?? null,
          plot: m.plot ?? null,
          genre: m.genre ?? null,
          cast: m.cast ?? null,
          director: m.director ?? null,
          duration: m.duration ?? null,
          streamUrl: m.streamUrl,
          categoryId,
        },
      });
    }

    // 5. Séries + temporadas + episódios (atualiza episodes streamUrl)
    for (const s of DEMO_SERIES) {
      const categoryId = s.categoryId ? catMap[`series-${s.categoryId}`] : null;
      const existing = await db.series.findFirst({
        where: { providerId: demoProvider.id, seriesId: s.seriesId },
      });
      let series: any;
      if (existing) {
        await db.series.update({
          where: { id: existing.id },
          data: {
            name: s.name,
            title: s.title,
            year: s.year ?? null,
            rating: s.rating ?? null,
            poster: s.poster ?? null,
            backdrop: s.backdrop ?? null,
            plot: s.plot ?? null,
            genre: s.genre ?? null,
            cast: s.cast ?? null,
            categoryId,
          },
        });
        series = existing;
      } else {
        series = await db.series.create({
          data: {
            providerId: demoProvider.id,
            seriesId: s.seriesId,
            name: s.name,
            title: s.title,
            year: s.year ?? null,
            rating: s.rating ?? null,
            poster: s.poster ?? null,
            backdrop: s.backdrop ?? null,
            plot: s.plot ?? null,
            genre: s.genre ?? null,
            cast: s.cast ?? null,
            categoryId,
          },
        });
      }
      for (const season of s.seasons) {
        let dbSeason = await db.season.findFirst({
          where: { seriesId: series.id, seasonNumber: season.seasonNumber },
        });
        if (!dbSeason) {
          dbSeason = await db.season.create({
            data: {
              seriesId: series.id,
              seasonNumber: season.seasonNumber,
              name: season.name ?? null,
              overview: season.overview ?? null,
            },
          });
        }
        for (const ep of season.episodes) {
          const existingEp = await db.episode.findFirst({
            where: { seasonId: dbSeason.id, episodeNum: ep.episodeNum },
          });
          if (existingEp) {
            await db.episode.update({
              where: { id: existingEp.id },
              data: {
                title: ep.title,
                overview: ep.overview ?? null,
                duration: ep.duration ?? null,
                streamUrl: ep.streamUrl,
                poster: ep.poster ?? null,
                airDate: ep.airDate ?? null,
              },
            });
          } else {
            await db.episode.create({
              data: {
                seasonId: dbSeason.id,
                episodeNum: ep.episodeNum,
                title: ep.title,
                overview: ep.overview ?? null,
                duration: ep.duration ?? null,
                streamUrl: ep.streamUrl,
                poster: ep.poster ?? null,
                airDate: ep.airDate ?? null,
              },
            });
          }
        }
      }
    }

    // 6. Canais + EPG (atualiza streamUrl)
    for (const c of DEMO_CHANNELS) {
      const categoryId = c.categoryId ? catMap[`live-${c.categoryId}`] : null;
      const existing = await db.channel.findFirst({
        where: { providerId: demoProvider.id, channelId: c.channelId },
      });
      let channel: any;
      if (existing) {
        await db.channel.update({
          where: { id: existing.id },
          data: {
            name: c.name,
            logo: c.logo ?? null,
            streamUrl: c.streamUrl,
            epgId: c.epgId ?? null,
            num: c.num ?? null,
            categoryId,
          },
        });
        channel = existing;
        // Atualiza EPG: apaga antigos e recria
        await db.epgEntry.deleteMany({ where: { channelId: channel.id } });
      } else {
        channel = await db.channel.create({
          data: {
            providerId: demoProvider.id,
            channelId: c.channelId,
            name: c.name,
            logo: c.logo ?? null,
            streamUrl: c.streamUrl,
            epgId: c.epgId ?? null,
            num: c.num ?? null,
            categoryId,
          },
        });
      }
      // EPG
      const programs = DEMO_EPG[c.id];
      if (programs) {
        for (const p of programs) {
          await db.epgEntry.create({
            data: {
              channelId: channel.id,
              title: p.title,
              description: p.description ?? null,
              start: new Date(p.start),
              end: new Date(p.end),
              category: p.category ?? null,
            },
          });
        }
      }
    }

    // 7. Contagem final
    const [movies, series, channels] = await Promise.all([
      db.movie.count({ where: { providerId: demoProvider.id } }),
      db.series.count({ where: { providerId: demoProvider.id } }),
      db.channel.count({ where: { providerId: demoProvider.id } }),
    ]);

    await db.provider.update({
      where: { id: demoProvider.id },
      data: {
        itemCount: movies + series + channels,
        status: "ready",
        lastSyncAt: new Date(),
        lastError: null,
      },
    });

    return NextResponse.json({
      ok: true,
      profile,
      providerId: demoProvider.id,
      counts: { movies, series, channels },
    });
  } catch (err) {
    console.error("[seed] erro:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao semear." },
      { status: 500 },
    );
  }
}
