"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  username: string;
  role: string;
  photoURL?: string;
}

interface RankingEntry {
  username: string;
  character: string;
  percent: number;
}

const RAIDS = [
  { id: 1047, name: "Karazhan" },
  { id: 1048, name: "Gruul & Magtheridon" },
];

export default function WowTbcPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [rankings, setRankings] = useState<Record<number, RankingEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleRaidCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, raidId: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push(`/ranking/${raidId}`);
    }
  };

  const handleRankEntryKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    username: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push(`/perfil/wow-tbc/${username.toLowerCase()}`);
    }
  };

  const goToProfile = (username: string) => {
    router.push(`/perfil/wow-tbc/${username.toLowerCase()}`);
  };

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch("/api/members?game=wowtbc");
        const users = (await res.json()) as Member[];
        setMembers(Array.isArray(users) ? users : []);
      } catch {
        setMembers([]);
      }
    };

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
    };

    const fetchAll = async () => {
      await Promise.all([fetchMembers(), fetchTop5()]);
      setLoading(false);
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-red-500 flex items-center justify-center">
        Carregando membros...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white py-20 px-6">

      <h1 className="text-5xl font-bold text-center text-red-500 mb-16 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
        World of Warcraft TBC Classic
      </h1>

      {/* RANKINGS */}
      <div className="mb-20">
        <h2 className="text-3xl font-bold text-center text-red-400 mb-10">
          Top 5 Rankings
        </h2>

        <div className="grid md:grid-cols-2 gap-10">
          {RAIDS.map((raid) => (
            <div
              key={raid.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/ranking/${raid.id}`)}
              onKeyDown={(event) => handleRaidCardKeyDown(event, raid.id)}
              className="bg-[#141414] border border-red-900 rounded-2xl p-6 cursor-pointer hover:border-red-500 transition"
            >
              <h3 className="text-2xl font-bold text-red-400 mb-6 text-center">
                {raid.name}
              </h3>

              {rankings[raid.id]?.length > 0 ? (
                <div className="space-y-4">
                  {rankings[raid.id].map((entry, index) => (
                    <div
                      key={index}
                      role="button"
                      tabIndex={0}
                      onClick={() => goToProfile(entry.username)}
                      onKeyDown={(event) =>
                        handleRankEntryKeyDown(event, entry.username)
                      }
                      className="flex justify-between items-center bg-[#1c1c1c] p-4 rounded-lg cursor-pointer hover:bg-[#242424] transition"
                    >
                      <div>
                        <p className="font-bold text-red-400">{entry.character}</p>
                        <p className="text-sm text-gray-400">{entry.username}</p>
                      </div>
                      <p className="text-xl font-bold text-yellow-400">
                        {entry.percent.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center">Nenhum dado disponível</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MEMBROS */}
      <h2 className="text-3xl font-bold text-center text-red-400 mb-10">
        Membros da Guilda
      </h2>

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">

        {members.map((member) => {
          const avatar =
            member.photoURL && member.photoURL.trim() !== ""
              ? member.photoURL
              : "/capilogo.png";

          const role = member.role.toLowerCase();

          return (
            <div
              key={member.id}
              onClick={() =>
                router.push(`/perfil/wow-tbc/${member.username.toLowerCase()}`)
              }
              className="cursor-pointer bg-[#141414] border border-red-900 rounded-2xl p-8 text-center flex flex-col items-center hover:bg-red-900/40 transition shadow-[0_0_20px_rgba(255,0,0,0.2)] hover:shadow-[0_0_35px_rgba(255,0,0,0.6)]"
            >
              {/* Avatar */}
              <div className="mb-4 w-[90px] h-[90px] rounded-full overflow-hidden border-2 border-red-600 shadow-[0_0_15px_rgba(255,0,0,0.6)] bg-zinc-800">
                <img
                  src={avatar}
                  alt={member.username}
                  className="w-full h-full object-cover"
                />
              </div>

              <h2 className="text-2xl font-bold text-red-400 mb-3">
                {member.username}
              </h2>

              <span
                className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${
                  role === "fundador"
                    ? "bg-red-600"
                    : role === "officer"
                    ? "bg-yellow-500 text-black"
                    : "bg-zinc-700"
                }`}
              >
                {member.role}
              </span>
            </div>
          );
        })}

      </div>
    </div>
  );
}
