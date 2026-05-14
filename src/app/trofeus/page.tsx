"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TrophyIcon from "@/components/trophy-icon";

interface RecentTrophyEntry {
  username: string;
  photoURL: string;
  trophy: {
    id?: string;
    name: string;
    description: string;
    icon?: string;
    points?: number;
    rarity?: string;
    awardedAt?: number | null;
  };
}

interface TrophyPlayer {
  username: string;
  photoURL: string;
  trophies: RecentTrophyEntry["trophy"][];
  latestAwardedAt: number;
  totalPoints: number;
}

function getRarityColor(rarity?: string) {
  switch ((rarity || "").toLowerCase()) {
    case "lendario":
      return "text-[#ff8000]";
    case "epico":
      return "text-[#a335ee]";
    case "raro":
      return "text-[#0070dd]";
    case "incomum":
      return "text-[#1eff00]";
    default:
      return "text-gray-300";
  }
}

function sortTrophiesForDisplay(trophies: RecentTrophyEntry["trophy"][]) {
  return [...trophies].sort((a, b) => {
    const pointsA = typeof a.points === "number" ? a.points : 0;
    const pointsB = typeof b.points === "number" ? b.points : 0;

    if (pointsB !== pointsA) {
      return pointsB - pointsA;
    }

    const awardedAtA = typeof a.awardedAt === "number" ? a.awardedAt : 0;
    const awardedAtB = typeof b.awardedAt === "number" ? b.awardedAt : 0;
    return awardedAtB - awardedAtA;
  });
}

export default function TrofeusPage() {
  const [entries, setEntries] = useState<RecentTrophyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentTrophies = async () => {
      try {
        const response = await fetch("/api/trophies/recent");
        const data = (await response.json()) as RecentTrophyEntry[];
        setEntries(Array.isArray(data) ? data : []);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTrophies();
  }, []);

  const players = useMemo(() => {
    const grouped = new Map<string, TrophyPlayer>();

    for (const entry of entries) {
      const key = entry.username.toLowerCase();
      const awardedAt =
        typeof entry.trophy.awardedAt === "number" ? entry.trophy.awardedAt : 0;
      const points =
        typeof entry.trophy.points === "number" ? entry.trophy.points : 0;

      if (!grouped.has(key)) {
        grouped.set(key, {
          username: entry.username,
          photoURL: entry.photoURL,
          trophies: [entry.trophy],
          latestAwardedAt: awardedAt,
          totalPoints: points,
        });
        continue;
      }

      const current = grouped.get(key);

      if (!current) {
        continue;
      }

      current.trophies.push(entry.trophy);
      current.latestAwardedAt = Math.max(current.latestAwardedAt, awardedAt);
      current.totalPoints += points;
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (b.trophies.length !== a.trophies.length) {
        return b.trophies.length - a.trophies.length;
      }

      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }

      return b.latestAwardedAt - a.latestAwardedAt;
    });
  }, [entries]);

  const podium = players.slice(0, 3);
  const remaining = players.slice(3);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent px-6 py-20 text-red-500 flex items-center justify-center">
        Carregando medalhas...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent px-6 py-20 text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-red-700/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-14 rounded-3xl border border-red-900/50 bg-[#0e0e0e]/80 p-8 text-center shadow-[0_0_35px_rgba(255,0,0,0.14)] backdrop-blur-sm">
          <h1 className="text-5xl font-bold text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)] md:text-6xl">
            Ranking de Medalhas
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-300">
            Os jogadores abaixo aparecem ranqueados por quantidade de medalhas e pontos acumulados.
          </p>

          <div className="mt-6 inline-flex items-center gap-4 rounded-full border border-red-900/70 bg-black/40 px-5 py-2 text-sm text-red-200">
            <span>{players.length} jogadores ranqueados</span>
            <span className="h-1 w-1 rounded-full bg-red-400" />
            <span>{entries.length} medalhas concedidas</span>
          </div>
        </div>

        {players.length > 0 ? (
          <>
            <div className="mb-10 grid gap-6 md:grid-cols-3">
              {podium.map((player, index) => (
                <Link
                  key={player.username}
                  href={`/perfil/wow-tbc/${player.username.toLowerCase()}/trofeus`}
                  className={`rounded-3xl border p-6 text-center shadow-[0_0_22px_rgba(255,0,0,0.14)] transition hover:-translate-y-1 hover:shadow-[0_0_34px_rgba(255,0,0,0.28)] ${
                    index === 0
                      ? "border-amber-500/60 bg-gradient-to-b from-[#2a1800] via-[#171006] to-[#0f0f0f]"
                      : index === 1
                      ? "border-gray-400/50 bg-gradient-to-b from-[#1e1e1e] via-[#141414] to-[#0f0f0f]"
                      : "border-orange-700/60 bg-gradient-to-b from-[#22140f] via-[#15100f] to-[#0f0f0f]"
                  }`}
                >
                  <p className="text-sm uppercase tracking-[0.3em] text-red-200">
                    #{index + 1}
                  </p>

                  <div className="mx-auto mt-4 h-20 w-20 overflow-hidden rounded-full border-2 border-red-700 bg-black/40">
                    <img
                      src={player.photoURL}
                      alt={player.username}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-[#ff8000] drop-shadow-[0_0_10px_rgba(255,128,0,0.35)]">
                    {player.username}
                  </h2>

                  <p className="mt-2 text-sm text-gray-300">
                    {player.trophies.length} medalhas
                  </p>

                  <p className="mt-1 text-sm font-semibold text-yellow-300">
                    {player.totalPoints} pontos
                  </p>

                  <div className="mt-5 flex justify-center gap-2">
                    {sortTrophiesForDisplay(player.trophies)
                      .slice(0, 5)
                      .map((trophy, trophyIndex) => (
                        <div
                          key={`${player.username}-podium-${trophy.name}-${trophyIndex}`}
                          className="group relative"
                          onClick={(event) => event.preventDefault()}
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-800/80 bg-black/40">
                            <TrophyIcon
                              icon={trophy.icon}
                              alt={trophy.name}
                              className="h-8 w-8"
                            />
                          </div>

                          <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 hidden w-56 -translate-x-1/2 rounded-xl border border-red-900/70 bg-[#0d0d0d] px-3 py-2 text-left shadow-[0_0_24px_rgba(0,0,0,0.45)] group-hover:block">
                            <p className={`text-sm font-semibold ${getRarityColor(trophy.rarity)}`}>
                              {trophy.name}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-gray-300">
                              {trophy.description}
                            </p>

                            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                              <span>{trophy.points || 0} pts</span>
                              <span>{trophy.rarity || "Comum"}</span>
                            </div>
                          </div>
                        </div>
                      ))}

                    {player.trophies.length > 5 ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-800/80 bg-black/40 text-xs font-semibold text-red-300">
                        +{player.trophies.length - 5}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {remaining.map((player, index) => (
                <Link
                  key={player.username}
                  href={`/perfil/wow-tbc/${player.username.toLowerCase()}/trofeus`}
                  className="rounded-2xl border border-red-900/80 bg-[#111]/90 p-6 shadow-[0_0_18px_rgba(255,0,0,0.12)] transition hover:-translate-y-1 hover:bg-red-900/20 hover:shadow-[0_0_30px_rgba(255,0,0,0.28)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-red-700 bg-black/40">
                      <img
                        src={player.photoURL}
                        alt={player.username}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-red-300">
                        #{index + 4}
                      </p>

                      <h2 className="text-2xl font-bold text-[#ff8000] drop-shadow-[0_0_10px_rgba(255,128,0,0.35)]">
                        {player.username}
                      </h2>

                      <p className="mt-1 text-sm text-gray-400">
                        {player.trophies.length} medalhas • {player.totalPoints} pontos
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {sortTrophiesForDisplay(player.trophies).slice(0, 6).map((trophy, trophyIndex) => (
                      <div
                        key={`${player.username}-${trophy.name}-${trophyIndex}`}
                        className="group relative"
                        onClick={(event) => event.preventDefault()}
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-800 bg-black/30">
                          <TrophyIcon
                            icon={trophy.icon}
                            alt={trophy.name}
                            className="h-10 w-10"
                          />
                        </div>

                        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 hidden w-56 -translate-x-1/2 rounded-xl border border-red-900/70 bg-[#0d0d0d] px-3 py-2 text-left shadow-[0_0_24px_rgba(0,0,0,0.45)] group-hover:block">
                          <p className={`text-sm font-semibold ${getRarityColor(trophy.rarity)}`}>
                            {trophy.name}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-gray-300">
                            {trophy.description}
                          </p>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                            <span>{trophy.points || 0} pts</span>
                            <span>{trophy.rarity || "Comum"}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {player.trophies.length > 6 ? (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-800 bg-black/30 text-sm font-semibold text-red-300">
                        +{player.trophies.length - 6}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-red-900/40 bg-[#111] p-10 text-center text-gray-400">
            Nenhum jogador com medalhas ainda.
          </div>
        )}
      </div>
    </div>
  );
}
