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
        Carregando trofeus...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-6 py-20 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h1 className="text-5xl font-bold text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
            Ranking de Trofeus
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-300">
            Os jogadores abaixo aparecem ranqueados por quantidade de trofeus e pontos acumulados.
          </p>
        </div>

        {players.length > 0 ? (
          <>
            <div className="mb-10 grid gap-6 md:grid-cols-3">
              {podium.map((player, index) => (
                <Link
                  key={player.username}
                  href={`/perfil/wow-tbc/${player.username.toLowerCase()}/trofeus`}
                  className="rounded-2xl border border-red-900 bg-[#111] p-6 text-center shadow-[0_0_18px_rgba(255,0,0,0.12)] transition hover:bg-red-900/20 hover:shadow-[0_0_30px_rgba(255,0,0,0.28)]"
                >
                  <p className="text-sm uppercase tracking-[0.3em] text-red-300">
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

                  <p className="mt-2 text-sm text-gray-400">
                    {player.trophies.length} trofeus
                  </p>

                  <p className="mt-1 text-sm text-yellow-300">
                    {player.totalPoints} pontos
                  </p>
                </Link>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {remaining.map((player, index) => (
                <Link
                  key={player.username}
                  href={`/perfil/wow-tbc/${player.username.toLowerCase()}/trofeus`}
                  className="rounded-2xl border border-red-900 bg-[#111] p-6 shadow-[0_0_18px_rgba(255,0,0,0.12)] transition hover:bg-red-900/20 hover:shadow-[0_0_30px_rgba(255,0,0,0.28)]"
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
                        {player.trophies.length} trofeus • {player.totalPoints} pontos
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {player.trophies.slice(0, 4).map((trophy, trophyIndex) => (
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

                    {player.trophies.length > 4 ? (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-800 bg-black/30 text-sm font-semibold text-red-300">
                        +{player.trophies.length - 4}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-red-900/40 bg-[#111] p-10 text-center text-gray-400">
            Nenhum jogador com trofeus ainda.
          </div>
        )}
      </div>
    </div>
  );
}
