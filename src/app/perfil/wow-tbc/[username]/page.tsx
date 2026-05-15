"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getGameTrophies, Trophy } from "@/lib/trophies";
import TrophyIcon from "@/components/trophy-icon";
import AvailabilityGrid, { flatToAvailability, createEmptyAvailability } from "@/components/availability-grid";

interface WowProfileUserData {
  username?: string;
  photoURL?: string;
  coverURL?: string;
  trophies?: Record<string, Trophy[]>;
  availability?: boolean[];
  applications?: {
    "wow-tbc"?: {
      mainCharacter?: string;
    };
  };
}

export default function PerfilWOW() {
  const { username } = useParams() as { username: string };

  const [userData, setUserData] = useState<WowProfileUserData | null>(null);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvailability, setShowAvailability] = useState(false);

  const normalizedUsername =
    typeof username === "string" ? username.toLowerCase() : "";

  useEffect(() => {
    const fetchUser = async () => {
      const snap = await getDocs(collection(db, "users"));

      const user = snap.docs
        .map((doc) => doc.data())
        .find(
          (u): u is WowProfileUserData =>
            typeof u?.username === "string" &&
            u.username.toLowerCase() === normalizedUsername
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
      <div className="min-h-screen bg-transparent text-red-500 flex items-center justify-center">
        Carregando perfil...
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        Usuario nao encontrado
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="relative h-[350px] w-full overflow-hidden">
        <img
          src={userData.coverURL || "/capa.jpg"}
          className="w-full h-full object-cover"
          alt=""
        />

        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="relative -mt-24 flex flex-col items-center">
          <div className="w-[160px] h-[160px] rounded-full border-4 border-red-600 overflow-hidden shadow-[0_0_30px_rgba(255,0,0,0.7)]">
            <img
              src={userData.photoURL || "/capilogo.png"}
              className="w-full h-full object-cover"
              alt={userData.username || "Avatar"}
            />
          </div>

          <h1 className="text-5xl font-bold mt-6 text-red-500">
            {userData.username}
          </h1>
        </div>

        <div className="mt-16 grid md:grid-cols-2 gap-10">
          <Link
            href={`/perfil/wow-tbc/${username}/personagens`}
            className="bg-[#141414] border border-red-900 rounded-2xl p-8 text-left hover:bg-red-900/40 transition shadow-[0_0_20px_rgba(255,0,0,0.25)] hover:shadow-[0_0_35px_rgba(255,0,0,0.6)]"
          >
            <h3 className="text-2xl font-bold text-red-400 mb-4">
              Personagens
            </h3>

            <p className="text-gray-400">
              Veja todos os personagens de {username}.
            </p>
          </Link>

          <Link
            href={`/perfil/wow-tbc/${username}/trofeus`}
            className="bg-[#141414] border border-red-900 rounded-2xl p-8 text-left hover:bg-red-900/40 transition shadow-[0_0_20px_rgba(255,0,0,0.25)] hover:shadow-[0_0_35px_rgba(255,0,0,0.6)]"
          >
            <h3 className="text-2xl font-bold text-red-400 mb-4">
              Trofeus
            </h3>

            <p className="text-gray-400">
              Visualize as conquistas no WoW TBC.
            </p>

            <div className="mt-4 text-yellow-400 text-sm">
              {trophies.length} trofeus desbloqueados
            </div>
          </Link>
        </div>

        {trophies.length > 0 && (
          <div className="mt-20">
            <h2 className="text-3xl text-red-400 mb-8 text-center">
              Trofeus
            </h2>

            <div className="grid md:grid-cols-4 gap-6">
              {trophies.map((trophy, index) => (
                <div
                  key={index}
                  className="bg-[#111] border border-red-900 p-6 rounded-xl text-center"
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

                  <p className="text-gray-500 text-sm mt-2">
                    {trophy.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 pb-20">
          <button
            onClick={() => setShowAvailability((v) => !v)}
            className="w-full flex items-center justify-between bg-[#141414] border border-red-900 rounded-2xl px-8 py-5 text-left hover:bg-red-900/10 transition"
          >
            <span className="text-xl font-bold text-red-400">Disponibilidade para jogar</span>
            <span className="text-red-600 text-lg">{showAvailability ? "▲" : "▼"}</span>
          </button>

          {showAvailability && (
            <div className="mt-3 bg-[#141414] border border-red-900 rounded-2xl px-8 py-6">
              <AvailabilityGrid
                value={
                  Array.isArray(userData.availability)
                    ? flatToAvailability(userData.availability)
                    : createEmptyAvailability()
                }
                readonly
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
