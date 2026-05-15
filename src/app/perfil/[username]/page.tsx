"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getGameTrophies, Trophy } from "@/lib/trophies";
import TrophyIcon from "@/components/trophy-icon";
import AvailabilityGrid, { flatToAvailability, createEmptyAvailability } from "@/components/availability-grid";

interface UserProfileData {
  username?: string;
  role?: string;
  photoURL?: string;
  coverURL?: string;
  characters?: unknown[];
  trophies?: Record<string, Trophy[]>;
  availability?: boolean[];
  applications?: {
    "wow-tbc"?: {
      status?: string;
      mainCharacter?: string;
    };
    "lol"?: {
      status?: string;
      riotId?: string;
    };
  };
}

export default function PerfilUser() {
  const { username } = useParams() as { username: string };
  const router = useRouter();

  const [userData, setUserData] = useState<UserProfileData | null>(null);
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
          (u): u is UserProfileData =>
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

  const wowApproved = userData.applications?.["wow-tbc"]?.status === "approved";
  const lolApproved = userData.applications?.["lol"]?.status === "approved";

  const characters = userData.characters || [];
  const mainCharacter = userData.applications?.["wow-tbc"]?.mainCharacter;
  const riotId = userData.applications?.["lol"]?.riotId;

  const navigateToGameProfile = (game: string) => {
    router.push(`/perfil/${game}/${username}`);
  };

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

          <span className="mt-4 px-8 py-2 rounded-full text-sm bg-zinc-700">
            {userData.role}
          </span>
        </div>

        <div className="mt-20 grid md:grid-cols-2 gap-10">
          {wowApproved && (
            <div
              onClick={() => navigateToGameProfile("wow-tbc")}
              className="bg-[#141414] border border-red-900 rounded-2xl p-8 cursor-pointer hover:bg-red-900/20 transition"
            >
              <h3 className="text-2xl font-bold text-red-400 mb-6">
                World of Warcraft TBC
              </h3>

              {mainCharacter && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400">Personagem Principal</p>
                  <a
                    href={`https://classicwowarmory.com/character/US/nightslayer/${mainCharacter.toLowerCase()}?game_version=classic`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="text-red-400 hover:text-red-300"
                  >
                    {mainCharacter}
                  </a>
                </div>
              )}

              {characters.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400">Personagens: {characters.length}</p>
                </div>
              )}

              <Link
                href={`/perfil/wow-tbc/${username}/personagens`}
                onClick={(e) => e.stopPropagation()}
                className="text-red-400 hover:text-red-300 underline"
              >
                Ver Personagens
              </Link>
            </div>
          )}

          {lolApproved && (
            <div
              onClick={() => navigateToGameProfile("lol")}
              className="bg-[#141414] border border-red-900 rounded-2xl p-8 cursor-pointer hover:bg-red-900/20 transition"
            >
              <h3 className="text-2xl font-bold text-red-400 mb-6">
                League of Legends
              </h3>

              {riotId && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400">Riot ID</p>
                  <a
                    href={`https://www.op.gg/summoners/br/${riotId.replace("#", "-")}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="text-red-400 hover:text-red-300"
                  >
                    {riotId}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {wowApproved && trophies.length > 0 && (
          <div className="mt-20">
            <h2 className="text-3xl text-red-400 mb-8 text-center">
              Trofeus WoW TBC
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

        <div className="mt-16">
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

        <div className="mt-12 text-center pb-20">
          <Link
            href="/time"
            className="text-sm text-gray-400 hover:text-red-500 underline"
          >
            Voltar para Times
          </Link>
        </div>
      </div>
    </div>
  );
}
