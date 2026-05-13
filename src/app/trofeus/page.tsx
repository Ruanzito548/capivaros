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
    awardedAt?: number | null;
  };
}

interface TrophyPlayer {
  username: string;
  photoURL: string;
  trophies: RecentTrophyEntry["trophy"][];
  latestAwardedAt: number;
}

function formatAwardedAt(value: number) {
  if (value <= 0) {
    return "Data nao informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

      if (!grouped.has(key)) {
        grouped.set(key, {
          username: entry.username,
          photoURL: entry.photoURL,
          trophies: [entry.trophy],
          latestAwardedAt: awardedAt,
        });
        continue;
      }

      const current = grouped.get(key);

      if (!current) {
        continue;
      }

      current.trophies.push(entry.trophy);
      current.latestAwardedAt = Math.max(current.latestAwardedAt, awardedAt);
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.latestAwardedAt - a.latestAwardedAt
    );
  }, [entries]);

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
            Jogadores Com Trofeus
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-300">
            Veja quais membros da guilda ja possuem trofeus cadastrados no perfil.
          </p>
        </div>

        {players.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {players.map((player) => (
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
                    <h2 className="text-2xl font-bold text-white">
                      {player.username}
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      {player.trophies.length} trofeus desbloqueados
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {player.trophies.slice(0, 4).map((trophy, index) => (
                    <div
                      key={`${player.username}-${trophy.name}-${index}`}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-800 bg-black/30"
                      title={`${trophy.name} - ${trophy.description}`}
                    >
                      <TrophyIcon
                        icon={trophy.icon}
                        alt={trophy.name}
                        className="h-10 w-10"
                      />
                    </div>
                  ))}

                  {player.trophies.length > 4 ? (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-800 bg-black/30 text-sm font-semibold text-red-300">
                      +{player.trophies.length - 4}
                    </div>
                  ) : null}
                </div>

                <p className="mt-5 text-xs text-gray-500">
                  Ultimo trofeu em {formatAwardedAt(player.latestAwardedAt)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-red-900/40 bg-[#111] p-10 text-center text-gray-400">
            Nenhum jogador com trofeus ainda.
          </div>
        )}
      </div>
    </div>
  );
}
