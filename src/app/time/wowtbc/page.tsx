"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getRoleLabel, isFounder, isOfficerTBC } from "@/lib/permissions";

interface Member {
  id: string;
  username: string;
  role?: string;
  photoURL?: string;
}

const ADMIN_ROLES = new Set(["admin", "fundador", "officer", "officer tbc"]);

export default function WowTbcPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch("/api/members?game=wowtbc");
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

  const [admins, guildMembers] = useMemo(() => {
    const adminList: Member[] = [];
    const memberList: Member[] = [];

    for (const member of members) {
      if (typeof member.username !== "string" || member.username.trim() === "") {
        continue;
      }

      const normalizedRole = (member.role ?? "").toLowerCase();

      if (ADMIN_ROLES.has(normalizedRole)) {
        adminList.push(member);
      } else {
        memberList.push(member);
      }
    }

    return [adminList, memberList];
  }, [members]);

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
        World of Warcraft TBC Classic
      </h1>

      {admins.length > 0 && (
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center text-red-400 mb-10">
            Admins
          </h2>

          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
            {admins.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onClick={() =>
                  router.push(`/perfil/wow-tbc/${member.username.toLowerCase()}`)
                }
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-3xl font-bold text-center text-red-400 mb-10">
          Membros da Guilda
        </h2>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
          {guildMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onClick={() =>
                  router.push(`/perfil/wow-tbc/${member.username.toLowerCase()}`)
                }
              />
          ))}
        </div>
      </section>
    </div>
  );
}

function MemberCard({
  member,
  onClick,
}: {
  member: Member;
  onClick: () => void;
}) {
  const displayName =
    typeof member.username === "string" && member.username.trim() !== ""
      ? member.username
      : "Usuario";
  const avatar =
    member.photoURL && member.photoURL.trim() !== ""
      ? member.photoURL
      : "/capilogo.png";

  const role = (member.role ?? "").toLowerCase();

  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-[#141414] border border-red-900 rounded-2xl p-8 text-center flex flex-col items-center hover:bg-red-900/40 transition shadow-[0_0_20px_rgba(255,0,0,0.2)] hover:shadow-[0_0_35px_rgba(255,0,0,0.6)]"
    >
      <div className="mb-4 w-[90px] h-[90px] rounded-full overflow-hidden border-2 border-red-600 shadow-[0_0_15px_rgba(255,0,0,0.6)] bg-zinc-800">
        <img
          src={avatar}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      </div>

      <h2 className="text-2xl font-bold text-red-400 mb-3">
        {displayName}
      </h2>

      <span
        className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${
          isFounder(member.role ?? "")
            ? "bg-red-600"
            : isOfficerTBC(member.role ?? "")
            ? "bg-yellow-500 text-black"
            : role === "admin"
            ? "bg-red-800"
            : "bg-zinc-700"
        }`}
      >
        {getRoleLabel(member.role ?? "member")}
      </span>
    </div>
  );
}
