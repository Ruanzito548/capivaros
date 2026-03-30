"use client";

import Link from "next/link";
import { useEffect, useState, KeyboardEvent, MouseEvent } from "react";
import { useRouter } from "next/navigation";

interface RankingEntry {
  username: string;
  character: string;
  percent: number;
  photoURL?: string;
}

const RAIDS = [
  { id: 1047, name: "Karazhan" },
  { id: 1048, name: "Gruul & Magtheridon" },
];

const PODIUM_STYLE = [
  {
    wrapper: "order-2 md:order-2",
    card: "min-h-[172px] bg-gradient-to-b from-yellow-300/25 via-yellow-500/15 to-[#1a1200] border-yellow-400/80",
    place: "text-yellow-300",
    score: "text-yellow-200",
  },
  {
    wrapper: "order-1 md:order-1 md:translate-y-6",
    card: "min-h-[148px] bg-gradient-to-b from-slate-200/20 via-slate-400/10 to-[#121212] border-slate-300/60",
    place: "text-slate-200",
    score: "text-slate-100",
  },
  {
    wrapper: "order-3 md:order-3 md:translate-y-10",
    card: "min-h-[132px] bg-gradient-to-b from-amber-700/30 via-amber-900/15 to-[#121212] border-amber-600/70",
    place: "text-amber-400",
    score: "text-amber-200",
  },
];

export default function RankingPage() {
  const [rankings, setRankings] = useState<Record<number, RankingEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const goToProfile = (username?: string) => {
    if (typeof username !== "string" || username.trim() === "") {
      return;
    }

    router.push(`/perfil/wow-tbc/${username.toLowerCase()}`);
  };

  const handleUsernameClick = (
    event: MouseEvent<HTMLSpanElement>,
    username?: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    goToProfile(username);
  };

  const handleUsernameKeyDown = (
    event: KeyboardEvent<HTMLSpanElement>,
    username?: string
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
    <div className="min-h-screen bg-transparent px-6 py-20 text-white">
      <h1 className="mb-16 text-center text-5xl font-bold text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
        Ranking TBC Classic
      </h1>

      {loading ? (
        <div className="text-center text-xl text-red-500">
          Carregando rankings...
        </div>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
          {RAIDS.map((raid) => {
            const ranking = rankings[raid.id] ?? [];
            const podium = ranking.slice(0, 3);
            const remaining = ranking.slice(3);

            return (
              <Link
                key={raid.id}
                href={`/ranking/${raid.id}`}
                className="group rounded-2xl border border-red-900 bg-[#141414] p-8 shadow-[0_0_20px_rgba(255,0,0,0.25)] transition hover:bg-red-900/30 hover:shadow-[0_0_35px_rgba(255,0,0,0.5)]"
              >
                <h2 className="mb-8 text-center text-2xl font-bold text-red-400">
                  {raid.name}
                </h2>

                {ranking.length ? (
                  <>
                    <div className="mb-8 grid gap-4 md:grid-cols-3 md:items-end">
                      {podium.map((entry, index) => {
                        const style = PODIUM_STYLE[index];

                        return (
                          <div key={`${entry.username}-${entry.character}`} className={style.wrapper}>
                            <div
                              className={`flex h-full flex-col justify-between rounded-2xl border px-4 py-5 text-center shadow-[0_0_20px_rgba(0,0,0,0.35)] ${style.card}`}
                            >
                              <div>
                                <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-full border-2 border-white/20 shadow-[0_0_18px_rgba(0,0,0,0.35)]">
                                  <img
                                    src={entry.photoURL || "/capilogo.png"}
                                    alt={`Foto de perfil de ${entry.username}`}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <p className={`text-sm font-bold uppercase tracking-[0.3em] ${style.place}`}>
                                  #{index + 1}
                                </p>
                                <p className="mt-3 text-lg font-bold leading-tight text-white">
                                  {entry.character}
                                </p>
                                <span
                                  role="link"
                                  tabIndex={0}
                                  className="mt-2 inline-block cursor-pointer text-sm text-red-300 underline underline-offset-2"
                                  onClick={(event) =>
                                    handleUsernameClick(event, entry.username)
                                  }
                                  onKeyDown={(event) =>
                                    handleUsernameKeyDown(event, entry.username)
                                  }
                                >
                                  {entry.username}
                                </span>
                              </div>

                              <p className={`mt-4 text-xl font-bold ${style.score}`}>
                                {entry.percent.toFixed(2)} Parse
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {remaining.length > 0 ? (
                      <div className="mt-6 space-y-3 md:mt-12">
                        {remaining.map((entry, index) => (
                          <div
                            key={`${entry.username}-${entry.character}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-red-900/40 bg-black/20 px-4 py-3"
                          >
                            <div className="pr-4">
                              <span className="font-bold text-red-300">
                                #{index + 4}
                              </span>
                              <span className="mx-2 text-red-900/70">|</span>
                              <span className="text-white">{entry.character}</span>
                              <span className="text-gray-400">
                                {" "}
                                (
                                <span
                                  role="link"
                                  tabIndex={0}
                                  className="cursor-pointer text-red-400 underline"
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
                            </div>

                            <span className="text-sm font-bold text-yellow-400">
                              {entry.percent.toFixed(2)} Parse
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-6 text-center text-sm text-red-500 opacity-70 transition group-hover:opacity-100">
                      Ver ranking completo -
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-500">Nenhum dado disponivel</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
