"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";

interface RankingEntry {
  username: string;
  character: string;
  percent: number;
  photoURL?: string;
}

const RAID_NAMES: Record<string, string> = {
  "1047": "Karazhan",
  "1048": "Gruul & Magtheridon",
  "1050": "SSC / TK",
};

const PODIUM_STYLE = [
  {
    wrapper: "order-2 md:order-2",
    card: "min-h-[200px] bg-gradient-to-b from-yellow-300/25 via-yellow-500/15 to-[#1a1200] border-yellow-400/80",
    place: "text-yellow-300",
    score: "text-yellow-200",
  },
  {
    wrapper: "order-1 md:order-1 md:translate-y-8",
    card: "min-h-[174px] bg-gradient-to-b from-slate-200/20 via-slate-400/10 to-[#121212] border-slate-300/60",
    place: "text-slate-200",
    score: "text-slate-100",
  },
  {
    wrapper: "order-3 md:order-3 md:translate-y-14",
    card: "min-h-[154px] bg-gradient-to-b from-amber-700/30 via-amber-900/15 to-[#121212] border-amber-600/70",
    place: "text-amber-400",
    score: "text-amber-200",
  },
];

export default function RaidRankingPage() {
  const params = useParams();
  const zone = params?.zone as string;
  const router = useRouter();

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const raidName = RAID_NAMES[zone] ?? "Raid Desconhecida";

  const goToProfile = (username?: string) => {
    if (typeof username !== "string" || username.trim() === "") {
      return;
    }

    router.push(`/perfil/wow-tbc/${username.toLowerCase()}`);
  };

  const handleUsernameKeyDown = (
    event: KeyboardEvent<HTMLSpanElement>,
    username?: string
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

  const podium = ranking.slice(0, 3);
  const remaining = ranking.slice(3);

  return (
    <div className="min-h-screen bg-transparent px-6 py-20 text-white">
      <h1 className="mb-4 text-center text-5xl font-bold text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
        {raidName}
      </h1>

      <h2 className="mb-16 text-center text-xl text-gray-400">
        Ranking Completo da Guilda
      </h2>

      {loading ? (
        <div className="text-center text-xl text-red-500">
          Carregando ranking...
        </div>
      ) : (
        <div className="mx-auto max-w-5xl">
          {ranking.length > 0 ? (
            <>
              <div className="mb-10 grid gap-4 md:grid-cols-3 md:items-end">
                {podium.map((entry, index) => {
                  const style = PODIUM_STYLE[index];

                  return (
                    <div
                      key={`${entry.username}-${entry.character}`}
                      className={style.wrapper}
                    >
                      <div
                        className={`flex h-full flex-col justify-between rounded-2xl border px-5 py-6 text-center shadow-[0_0_20px_rgba(0,0,0,0.35)] ${style.card}`}
                      >
                        <div>
                          <div className="mx-auto mb-5 h-20 w-20 overflow-hidden rounded-full border-2 border-white/20 shadow-[0_0_18px_rgba(0,0,0,0.35)]">
                            <img
                              src={entry.photoURL || "/capilogo.png"}
                              alt={`Foto de perfil de ${entry.username}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <p
                            className={`text-sm font-bold uppercase tracking-[0.3em] ${style.place}`}
                          >
                            #{index + 1}
                          </p>
                          <p className="mt-4 text-2xl font-bold leading-tight text-white">
                            {entry.character}
                          </p>
                          <span
                            role="link"
                            tabIndex={0}
                            className="mt-3 inline-block cursor-pointer text-base text-red-300 underline underline-offset-2"
                            onClick={() => goToProfile(entry.username)}
                            onKeyDown={(event) =>
                              handleUsernameKeyDown(event, entry.username)
                            }
                          >
                            {entry.username}
                          </span>
                        </div>

                        <p className={`mt-6 text-3xl font-bold ${style.score}`}>
                          {entry.percent.toFixed(2)} Parse
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 space-y-4 md:mt-20">
                {remaining.map((entry, index) => (
                  <div
                    key={`${entry.username}-${entry.character}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-red-900 bg-[#141414] p-6 shadow-[0_0_15px_rgba(255,0,0,0.2)]"
                  >
                    <div className="pr-4">
                      <span className="text-lg font-bold text-red-300">
                        #{index + 4}
                      </span>
                      <span className="mx-3 text-red-900/70">|</span>
                      <span className="text-lg text-white">{entry.character}</span>
                      <span className="text-gray-400">
                        {" "}
                        (
                        <span
                          role="link"
                          tabIndex={0}
                          className="cursor-pointer text-red-400 underline"
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

                    <div className="text-xl font-bold text-yellow-400">
                      {entry.percent.toFixed(2)} Parse
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500">Nenhum ranking disponivel.</p>
          )}
        </div>
      )}
    </div>
  );
}
