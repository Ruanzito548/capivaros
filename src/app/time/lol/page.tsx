"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRoleLabel, isFounder, isOfficerTBC } from "@/lib/permissions";

interface Member {
  id: string;
  username: string;
  role: string;
  photoURL?: string;
}

export default function LolPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch("/api/members?game=lol");
        const users = (await res.json()) as Member[];
        setMembers(Array.isArray(users) ? users : []);
      } catch {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-red-500 flex items-center justify-center">
        Carregando membros...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white py-20 px-6">

      <h1 className="text-5xl font-bold text-center text-red-500 mb-16 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
        League of Legends
      </h1>

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">

        {members.map((member) => {
          const avatar =
            member.photoURL && member.photoURL.trim() !== ""
              ? member.photoURL
              : "/capilogo.png";

          return (
            <div
              key={member.id}
              onClick={() =>
                router.push(`/perfil/${member.username.toLowerCase()}`)
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
                  isFounder(member.role)
                    ? "bg-blue-600"
                    : isOfficerTBC(member.role)
                    ? "bg-yellow-500 text-black"
                    : "bg-zinc-700"
                }`}
              >
                {getRoleLabel(member.role)}
              </span>
            </div>
          );
        })}

      </div>
    </div>
  );
}
