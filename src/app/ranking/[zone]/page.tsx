"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";

interface RankingEntry {
  username: string;
  character: string;
  percent: number;
}

const RAID_NAMES: Record<string, string> = {
  "1047": "Karazhan",
  "1048": "Gruul & Magtheridon",
};

export default function RaidRankingPage() {
  const params = useParams();
  const zone = params?.zone as string;
  const router = useRouter();

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const raidName = RAID_NAMES[zone] ?? "Raid Desconhecida";

  const goToProfile = (username: string) => {
    router.push(`/perfil/wow-tbc/${username.toLowerCase()}`);
  };

  const handleUsernameKeyDown = (
    event: KeyboardEvent<HTMLSpanElement>,
    username: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToProfile(username);
    }
  };

  useEffect(() => {
    if (!zone) return;

    const fetchRanking = async () => {
      try {
        const res = await fetch(`/api/ranking?zone=${zone}`);
        const data = await res.json();
        setRanking(data);
      } catch {
        setRanking([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [zone]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0b0b] to-[#120000] text-white py-20 px-6">
      <h1 className="text-5xl font-bold text-center text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
        {raidName}
      </h1>

      <h2 className="text-xl text-center text-gray-400 mb-16">
        Ranking Completo da Guilda
      </h2>

      {loading ? (
        <div className="text-center text-red-500 text-xl">
          Carregando ranking...
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-4">
          {ranking.length > 0 ? (
            ranking.map((entry, index) => {
              const isTop3 = index < 3;

              return (
                <div
                  key={index}
                  className={`rounded-xl p-6 flex justify-between items-center border shadow-[0_0_15px_rgba(255,0,0,0.2)]
                    ${
                      isTop3
                        ? "bg-red-900/40 border-red-600 shadow-[0_0_25px_rgba(255,0,0,0.6)]"
                        : "bg-[#141414] border-red-900"
                    }`}
                >
                  <div>
                    <span className="font-bold text-lg">
                      #{index + 1}
                    </span>{" "}
                    — {entry.character}{" "}
                    <span className="text-gray-400">
                      (
                          <span
                            role="link"
                            tabIndex={0}
                            className="text-red-400 underline cursor-pointer"
                            onClick={() => goToProfile(entry.username)}
                            onKeyDown={(event) =>
                              handleUsernameKeyDown(event, entry.username)
                            }
                          >
                            {entry.username}
                          </span>
                          )
                    </span>
                  </div>

                  <div className="text-yellow-400 font-bold text-2xl">
                    {entry.percent.toFixed(2)} Parse
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-500">
              Nenhum ranking disponível.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
