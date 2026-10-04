"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  isRaidCharacterClass,
  RAID_CHARACTER_CLASSES,
  isRaidCoreId,
  RAID_CORE_SIZES,
  type RaidCoreSignup,
} from "@/lib/raid-cores";

interface Character {
  name: string;
  server: string;
}

interface CorePayload {
  roster: RaidCoreSignup[];
  mySignups: RaidCoreSignup[];
}

function characterIdentity(name: string, server: string) {
  return `${server.trim().normalize("NFKC").toLowerCase()}:${name
    .trim()
    .normalize("NFKC")
    .toLowerCase()}`;
}

export default function RaidCorePage() {
  const { coreId: coreParam } = useParams<{ coreId: string }>();
  const coreId = isRaidCoreId(coreParam) ? coreParam : null;
  const [user, setUser] = useState<User | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [payload, setPayload] = useState<CorePayload>({ roster: [], mySignups: [] });
  const [selectedCharacters, setSelectedCharacters] = useState<Record<number, string>>({});
  const [selectedClasses, setSelectedClasses] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submittingSize, setSubmittingSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!coreId) {
      router.replace("/raid-cores");
      return;
    }

    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true);
      setError(null);

      try {
        let token: string | null = null;
        if (currentUser) {
          token = await currentUser.getIdToken();
          const userSnapshot = await getDoc(doc(db, "users", currentUser.uid));
          const userCharacters = userSnapshot.data()?.characters;
          setCharacters(
            Array.isArray(userCharacters)
              ? userCharacters.filter(
                  (character): character is Character =>
                    typeof character?.name === "string" &&
                    typeof character?.server === "string"
                )
              : []
          );
        } else {
          setCharacters([]);
        }

        const response = await fetch(`/api/raid-cores/${coreId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = (await response.json()) as CorePayload & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Nao foi possivel carregar a composicao.");
        }

        if (!cancelled) {
          setPayload({
            roster: Array.isArray(data.roster) ? data.roster : [],
            mySignups: Array.isArray(data.mySignups) ? data.mySignups : [],
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nao foi possivel carregar a composicao."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [coreId, router]);

  const handleSignup = async (size: number) => {
    if (!user || !coreId) {
      router.push("/login");
      return;
    }

    const character = characters.find(
      (candidate) =>
        characterIdentity(candidate.name, candidate.server) ===
        selectedCharacters[size]
    );
    if (!character) {
      setError("Selecione um personagem aprovado da sua conta.");
      return;
    }
    if (!isRaidCharacterClass(selectedClasses[size])) {
      setError("Selecione a classe do personagem.");
      return;
    }

    setSubmittingSize(size);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/raid-cores/${coreId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          size,
          characterName: character.name,
          characterClass: selectedClasses[size],
          server: character.server,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Nao foi possivel fazer a inscricao.");
      }

      const refreshResponse = await fetch(`/api/raid-cores/${coreId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshed = (await refreshResponse.json()) as CorePayload;
      setPayload({
        roster: Array.isArray(refreshed.roster) ? refreshed.roster : [],
        mySignups: Array.isArray(refreshed.mySignups) ? refreshed.mySignups : [],
      });
      setSelectedCharacters((current) => ({ ...current, [size]: "" }));
      setSelectedClasses((current) => ({ ...current, [size]: "" }));
    } catch (signupError) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : "Nao foi possivel fazer a inscricao."
      );
    } finally {
      setSubmittingSize(null);
    }
  };

  if (!coreId || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-400">
        Carregando core...
      </div>
    );
  }

  const registeredCharacters = new Map(
    payload.mySignups.map((signup) => [
      characterIdentity(signup.characterName, signup.server),
      signup,
    ])
  );

  return (
    <div className="min-h-screen bg-transparent px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/raid-cores"
          className="mb-8 inline-block text-sm text-gray-400 underline hover:text-red-400"
        >
          Voltar para cores
        </Link>

        <h1 className="mb-10 text-center text-4xl font-bold text-red-500">
          Core {coreId}
        </h1>

        {error && (
          <p role="alert" className="mb-6 text-center text-red-300">
            {error}
          </p>
        )}

        {!user && (
          <div className="mb-8 text-center">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="rounded-md bg-red-700 px-5 py-3 font-semibold transition hover:bg-red-600"
            >
              Entrar para se inscrever
            </button>
          </div>
        )}

        {user && payload.mySignups.length > 0 && (
          <section className="mb-10 border-b border-red-900 pb-6">
            <h2 className="mb-4 text-xl font-semibold text-red-300">
              Inscricoes da sua conta
            </h2>
            <ul className="flex flex-wrap gap-3">
              {payload.mySignups.map((signup) => (
                <li
                  key={signup.id}
                  className="rounded border border-red-900 bg-[#111] px-4 py-2 text-sm"
                >
                  {signup.characterName} · {signup.characterClass || "Classe pendente"} · Core {signup.coreId} · {signup.size}
                  {" pessoas · "}
                  {signup.status === "selected" ? `Grupo ${Math.ceil((signup.slot ?? 1) / 5)}` : "Aguardando"}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="space-y-12">
          {RAID_CORE_SIZES.map((size) => {
            const sizeRoster = payload.roster.filter((member) => member.size === size);
            const sizeSignups = payload.mySignups.filter(
              (signup) => signup.coreId === coreId && signup.size === size
            );
            const occupiedSlots = new Set(
              sizeRoster.map((member) => member.slot).filter((slot): slot is number => slot !== null)
            );
            const groupCount = size / 5;

            return (
              <section key={size} className="border-t border-red-900 pt-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-red-400">
                      Core {size} pessoas
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                      {sizeRoster.length} / {size} vagas montadas
                    </p>
                  </div>

                  {user && (
                    <div className="flex flex-col gap-2 sm:min-w-[32rem] sm:flex-row">
                      <select
                        aria-label={`Personagem para Core ${size}`}
                        value={selectedCharacters[size] ?? ""}
                        onChange={(event) =>
                          setSelectedCharacters((current) => ({
                            ...current,
                            [size]: event.target.value,
                          }))
                        }
                        className="min-w-0 flex-1 rounded-md border border-red-900 bg-[#111] px-3 py-2 text-white"
                        disabled={characters.length === 0 || submittingSize !== null}
                      >
                        <option value="">
                          {characters.length ? "Selecione personagem" : "Sem personagem aprovado"}
                        </option>
                        {characters.map((character) => {
                          const identity = characterIdentity(character.name, character.server);
                          const existingSignup = registeredCharacters.get(identity);
                          return (
                            <option
                              key={identity}
                              value={identity}
                              disabled={Boolean(existingSignup)}
                            >
                              {character.name}
                              {existingSignup
                                ? ` · Core ${existingSignup.coreId}, ${existingSignup.size} pessoas`
                                : ""}
                            </option>
                          );
                        })}
                      </select>
                      <select
                        aria-label={`Classe para Core ${size}`}
                        value={selectedClasses[size] ?? ""}
                        onChange={(event) =>
                          setSelectedClasses((current) => ({
                            ...current,
                            [size]: event.target.value,
                          }))
                        }
                        className="min-w-0 flex-1 rounded-md border border-red-900 bg-[#111] px-3 py-2 text-white"
                        disabled={submittingSize !== null}
                      >
                        <option value="">Selecione a classe</option>
                        {RAID_CHARACTER_CLASSES.map((characterClass) => (
                          <option key={characterClass} value={characterClass}>
                            {characterClass}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleSignup(size)}
                        disabled={
                          !selectedCharacters[size] ||
                          !selectedClasses[size] ||
                          submittingSize !== null
                        }
                        className="rounded-md bg-red-700 px-4 py-2 font-semibold transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submittingSize === size ? "Enviando..." : "Inscrever-se"}
                      </button>
                    </div>
                  )}
                </div>

                {sizeSignups.length > 0 && (
                  <p className="mb-4 text-sm text-amber-300">
                    {sizeSignups.length} inscricao(oes) sua(s) aguardando montagem
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: groupCount }, (_, groupIndex) => (
                    <div key={groupIndex}>
                      <h3 className="mb-2 text-center text-sm font-semibold text-gray-400">
                        Grupo {groupIndex + 1}
                      </h3>
                      <ol className="space-y-1">
                        {Array.from({ length: 5 }, (_, memberIndex) => {
                          const slot = groupIndex * 5 + memberIndex + 1;
                          const member = sizeRoster.find((candidate) => candidate.slot === slot);
                          return (
                            <li
                              key={slot}
                              className="flex min-h-11 items-center border border-white/10 bg-[#111] px-3 text-sm"
                            >
                              {member ? (
                                <span className="min-w-0">
                                  <span className="font-semibold text-white">
                                    {member.characterName}
                                  </span>
                                  <span className="ml-2 text-xs text-red-300">
                                    {member.characterClass || "Classe pendente"}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-gray-600">Vaga {slot}</span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ))}
                </div>

                {occupiedSlots.size >= size && (
                  <p className="mt-4 text-sm text-emerald-300">Composicao completa</p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}