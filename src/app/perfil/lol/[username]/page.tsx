"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PerfilLOL() {

  const { username } = useParams() as { username: string };

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const fetchUser = async () => {

      const snap = await getDocs(collection(db, "users"));

      const user = snap.docs
        .map(doc => doc.data())
        .find((u: any) => u.username.toLowerCase() === username.toLowerCase());

      if (!user) {
        setLoading(false);
        return;
      }

      setUserData(user);
      setLoading(false);

    };

    fetchUser();

  }, [username]);

  if (loading) {

    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">
        Carregando perfil...
      </div>
    );

  }

  if (!userData) {

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Usuário não encontrado
      </div>
    );

  }

  const riotId = userData.applications?.["lol"]?.riotId;

  return (

    <div className="min-h-screen bg-gradient-to-b from-[#0b0b0b] to-[#120000] text-white">

      {/* CAPA */}

      <div className="relative h-[350px] w-full overflow-hidden">

        <img
          src={userData.coverURL || "/capa.jpg"}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/60" />

      </div>

      <div className="max-w-6xl mx-auto px-6">

        {/* PERFIL */}

        <div className="relative -mt-24 flex flex-col items-center">

          <div className="w-[160px] h-[160px] rounded-full border-4 border-red-600 overflow-hidden shadow-[0_0_30px_rgba(255,0,0,0.7)]">

            <img
              src={userData.photoURL || "/capilogo.png"}
              className="w-full h-full object-cover"
            />

          </div>

          <h1 className="text-5xl font-bold mt-6 text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
            {userData.username}
          </h1>

          <span className="mt-4 px-8 py-2 rounded-full text-sm bg-zinc-700">
            {userData.role}
          </span>

        </div>

        {/* RIOT ID */}

        {riotId && (

          <div className="mt-16 text-center">

            <h2 className="text-3xl text-red-400 mb-6">
              Riot ID
            </h2>

            <a
              href={`https://www.op.gg/summoners/br/${riotId.replace("#", "-")}`}
              target="_blank"
              className="bg-[#141414] border border-red-900 rounded-xl p-6 inline-block hover:bg-red-900/40 transition"
            >

              <p className="text-xl font-bold text-red-400">
                {riotId}
              </p>

              <p className="text-gray-400 text-sm mt-2">
                Ver no OP.GG
              </p>

            </a>

          </div>

        )}

        {/* VOLTAR */}

        <div className="mt-20 text-center pb-20">

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