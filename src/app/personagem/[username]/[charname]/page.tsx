"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function CharacterProfile() {
  const { username, charname } = useParams() as { username: string; charname: string };
  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const server = "nightslayer";
  const region = "US";

  useEffect(() => {
    const fetchCharacter = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        if (
          data.username &&
          data.username.toLowerCase() === username.toLowerCase()
        ) {
          const found = data.characters?.find(
            (c: any) =>
              c.name.toLowerCase() === charname.toLowerCase()
          );

          if (found) {
            setCharacter(found);
          }
        }
      });

      setLoading(false);
    };

    fetchCharacter();
  }, [username, charname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-red-500 flex items-center justify-center">
        Carregando personagem...
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-transparent text-red-500 flex items-center justify-center">
        Personagem não encontrado.
      </div>
    );
  }

  const armoryUrl = `https://classicwowarmory.com/character/${region}/${server}/${character.name.toLowerCase()}?game_version=classic`;

  return (
    <div className="min-h-screen bg-transparent text-white py-20 px-6">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-5xl font-bold text-center text-red-500 mb-10 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
          {character.name}
        </h1>

        <p className="text-center text-gray-400 mb-8">
          Servidor: {character.server}
        </p>

        {/* BOTÃO ARMORY */}
        <div className="text-center mb-10">
          <a
            href={armoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg shadow-[0_0_10px_rgba(255,0,0,0.6)] transition"
          >
            Ver no Classic Armory
          </a>
        </div>

        {/* PREVIEW ARMORY */}
        <div className="bg-[#141414] border border-red-900 rounded-2xl p-4 shadow-[0_0_20px_rgba(255,0,0,0.25)] overflow-hidden">

          <div
            style={{
              transform: "scale(0.75)",
              transformOrigin: "top left",
              width: "133%",
              height: "1400px",
            }}
          >
            <iframe
              src={armoryUrl}
              style={{
                width: "100%",
                height: "1800px",
                border: "none",
              }}
            />
          </div>

        </div>

      </div>
    </div>
  );
}
