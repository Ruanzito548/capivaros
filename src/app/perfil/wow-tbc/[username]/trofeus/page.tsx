"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getGameTrophies, Trophy } from "@/lib/trophies";
import TrophyIcon from "@/components/trophy-icon";

interface WowTrophyProfileUserData {
  username?: string;
  trophies?: Record<string, Trophy[]>;
}

export default function PerfilWowTrofeusPage() {
  const { username } = useParams() as { username: string };

  const [userData, setUserData] = useState<WowTrophyProfileUserData | null>(null);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizedUsername =
    typeof username === "string" ? username.toLowerCase() : "";

  useEffect(() => {
    const fetchUser = async () => {
      const snap = await getDocs(collection(db, "users"));

      const user = snap.docs
        .map((doc) => doc.data())
        .find(
          (candidate): candidate is WowTrophyProfileUserData =>
            typeof candidate?.username === "string" &&
            candidate.username.toLowerCase() === normalizedUsername
        );

      if (!user) {
        setLoading(false);
        return;
      }

      setUserData(user);
      setTrophies(getGameTrophies(user.trophies, "wow-tbc"));
      setLoading(false);
    };

    fetchUser();
  }, [normalizedUsername]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6 py-16 text-red-500">
        Carregando trofeus...
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6 py-16 text-white">
        Usuario nao encontrado
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-red-900/40 bg-black/20 p-10 text-center shadow-[0_0_35px_rgba(255,0,0,0.08)] backdrop-blur-sm">
          <div className="mb-6 text-6xl text-red-500/70">
            Trofeus
          </div>

          <h1 className="text-5xl font-bold tracking-wide text-white/90">
            {userData.username}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-300/80">
            Trofeus cadastrados manualmente para este jogador.
          </p>
        </div>

        {trophies.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {trophies.map((trophy, index) => (
              <div
                key={`${trophy.name}-${index}`}
                className="rounded-xl border border-red-900 bg-[#111] p-6 text-center shadow-[0_0_10px_rgba(255,0,0,0.2)]"
              >
                <div className="mb-3 flex justify-center text-4xl">
                  <TrophyIcon
                    icon={trophy.icon}
                    alt={trophy.name}
                    className="h-14 w-14"
                  />
                </div>

                <p className="font-semibold text-red-400">
                  {trophy.name}
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  {trophy.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-red-900/30 bg-[#111]/80 p-8 text-center text-gray-400">
            Este jogador ainda nao possui trofeus cadastrados.
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href={`/perfil/wow-tbc/${username}`}
            className="text-sm text-gray-400 underline hover:text-red-500"
          >
            Voltar para o perfil
          </Link>
        </div>
      </div>
    </div>
  );
}
