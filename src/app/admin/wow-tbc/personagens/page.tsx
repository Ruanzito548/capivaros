"use client";

import { useCallback, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { canApproveCharacters } from "@/lib/permissions";

interface LinkedCharacter {
  userId: string;
  username: string;
  characterName: string;
  server: string;
}

export default function AdminCharactersPage() {
  const [characters, setCharacters] = useState<LinkedCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  const router = useRouter();

  const fetchCharacters = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.push("/");
      return;
    }

    const token = await currentUser.getIdToken();
    const response = await fetch("/api/admin/wow-tbc/characters", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Erro ao buscar personagens.");
    }

    const list = (await response.json()) as LinkedCharacter[];
    setCharacters(list);
  }, [router]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          router.push("/");
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          router.push("/");
          return;
        }

        const data = snap.data();

        if (!canApproveCharacters(data.role)) {
          router.push("/");
          return;
        }

        await fetchCharacters();
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar personagens vinculados:", error);
        router.push("/");
      }
    });

    return () => unsub();
  }, [fetchCharacters, router]);

  const unlinkCharacter = async (characterName: string) => {
    const confirmed = window.confirm(
      `Deseja realmente desvincular o personagem ${characterName}?`
    );

    if (!confirmed) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push("/");
        return;
      }

      setDeletingName(characterName);

      const token = await currentUser.getIdToken();
      const response = await fetch("/api/admin/wow-tbc/characters/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: characterName,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erro ao desvincular personagem.");
      }

      await fetchCharacters();
    } catch (error) {
      console.error("Erro ao desvincular personagem:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao desvincular personagem."
      );
    } finally {
      setDeletingName(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Carregando personagens...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white p-12 flex justify-center">
      <div className="max-w-6xl w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-red-500">
            Personagens Vinculados
          </h1>

          <p className="text-gray-400 mt-3">
            Veja todos os personagens existentes e remova o vinculo quando necessario.
          </p>
        </div>

        <div className="space-y-4">
          {characters.length === 0 && (
            <p className="text-gray-400">
              Nenhum personagem vinculado encontrado.
            </p>
          )}

          {characters.map((character) => (
            <div
              key={`${character.userId}-${character.characterName}`}
              className="bg-[#111] border border-red-900 p-6 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <p className="text-xl font-bold text-red-400">
                  {character.characterName}
                </p>

                <p className="text-gray-400 text-sm">
                  Vinculado a: {character.username}
                </p>

                <p className="text-gray-500 text-sm">
                  Servidor: {character.server}
                </p>
              </div>

              <button
                onClick={() => unlinkCharacter(character.characterName)}
                disabled={deletingName === character.characterName}
                className="bg-red-700 hover:bg-red-800 disabled:opacity-60 px-5 py-3 rounded-lg"
              >
                {deletingName === character.characterName
                  ? "Excluindo..."
                  : "Excluir do Firebase"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
