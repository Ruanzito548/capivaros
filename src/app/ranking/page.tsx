"use client";

import Link from "next/link";
import { useEffect, useState, KeyboardEvent, MouseEvent } from "react";
import { useRouter } from "next/navigation";

interface RankingEntry {
  username: string;
  character: string;
  percent: number;
}

const RAIDS = [
  { id: 1047, name: "Karazhan" },
  { id: 1048, name: "Gruul & Magtheridon" },
];

export default function RankingPage() {
  const [rankings, setRankings] = useState<Record<number, RankingEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const goToProfile = (username: string) => {
    router.push(`/perfil/wow-tbc/${username.toLowerCase()}`);
  };

  const handleUsernameClick = (
    event: MouseEvent<HTMLSpanElement>,
    username: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    goToProfile(username);
  };

  const handleUsernameKeyDown = (
    event: KeyboardEvent<HTMLSpanElement>,
    username: string
  ) => {
    event.stopPropagation();
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToProfile(username);
    }
  };

  useEffect(() => {
    const fetchTop5 = async () => {
      const result: Record<number, RankingEntry[]> = {};

      for (const raid of RAIDS) {
        try {
          const res = await fetch(`/api/ranking?zone=${raid.id}&limit=5`);
          const data = await res.json();
          result[raid.id] = data;
        } catch {
          result[raid.id] = [];
        }
      }

      setRankings(result);
      setLoading(false);
    };

    fetchTop5();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0b0b] to-[#120000] text-white py-20 px-6">
      <h1 className="text-5xl font-bold text-center text-red-500 mb-16 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
        Ranking TBC Classic
      </h1>

      {loading ? (
        <div className="text-center text-red-500 text-xl">
          Carregando rankings...
        </div>
      ) : (
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          {RAIDS.map((raid) => (
            <Link
              key={raid.id}
              href={`/ranking/${raid.id}`}
              className="group bg-[#141414] border border-red-900 rounded-2xl p-8 hover:bg-red-900/30 transition shadow-[0_0_20px_rgba(255,0,0,0.25)] hover:shadow-[0_0_35px_rgba(255,0,0,0.5)]"
            >
              <h2 className="text-2xl font-bold text-red-400 mb-6 text-center">
                {raid.name}
              </h2>

              {rankings[raid.id]?.length ? (
                <>
                  {rankings[raid.id].map((entry, index) => {
                    const isTop3 = index < 3;

                    return (
                      <div
                        key={index}
                        className={`flex justify-between py-2 border-b border-red-900/40 ${
                          isTop3 ? "text-yellow-400 font-bold" : ""
                        }`}
                      >
                        <span>
                          #{index + 1} — {entry.character} (
                          <span
                            role="link"
                            tabIndex={0}
                            className="text-red-400 underline cursor-pointer"
                            onClick={(event) =>
                              handleUsernameClick(event, entry.username)
                            }
                            onKeyDown={(event) =>
                              handleUsernameKeyDown(event, entry.username)
                            }
                          >
                            {entry.username}
                          </span>
                          )
                        </span>
                        <span className="text-yellow-400 font-bold">
  {entry.percent.toFixed(2)} Parse
</span>
                      </div>
                    );
                  })}

                  <div className="mt-6 text-center text-sm text-red-500 opacity-70 group-hover:opacity-100 transition">
                    Ver ranking completo →
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center">
                  Nenhum dado disponível
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
