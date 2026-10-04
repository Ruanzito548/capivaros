"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import WowSpecIcons from "@/components/wow-spec-icons";
import { auth, db } from "@/lib/firebase";
import { getWowClassColor } from "@/lib/wow-classes";
import {
  isRaidCoreId,
  RAID_CORE_SIZES,
  type RaidCoreSignup,
} from "@/lib/raid-cores";

interface Character {
  name: string;
  server: string;
  characterClass?: string;
  mainSpec?: string;
  offSpec?: string | null;
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
  const [openCharacterListSize, setOpenCharacterListSize] = useState<number | null>(null);
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
    if (!character.characterClass) {
      setError("Esse personagem ainda nao tem classe salva no perfil.");
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
      `${signup.coreId}:${signup.size}:${characterIdentity(
        signup.characterName,
        signup.server
      )}`,
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
                  <span style={{ color: getWowClassColor(signup.characterClass) }}>
                    {signup.characterName}
                  </span>
                  {` · ${signup.characterClass || "Classe pendente"} · Core ${signup.coreId} · ${signup.size}`}
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
              (signup) =>
                signup.coreId === coreId &&
                signup.size === size &&
                signup.status === "pending"
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
                    <div className="grid min-w-0 gap-2 sm:w-full sm:max-w-md sm:grid-cols-[minmax(0,1fr)_auto]">
                      {characters.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Nenhum personagem aprovado
                        </p>
                      ) : (
                        <div
                          className="relative min-w-0"
                          onBlur={(event) => {
                            const nextTarget = event.relatedTarget as Node | null;
                            if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                              setOpenCharacterListSize(null);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setOpenCharacterListSize(null);
                          }}
                        >
                          {(() => {
                            const selectedCharacter = characters.find(
                              (character) =>
                                characterIdentity(character.name, character.server) ===
                                selectedCharacters[size]
                            );

                            return (
                              <>
                                <button
                                  type="button"
                                  aria-haspopup="listbox"
                                  aria-expanded={openCharacterListSize === size}
                                  aria-label={`Personagem para Core ${size}`}
                                  disabled={submittingSize !== null}
                                  onClick={() =>
                                    setOpenCharacterListSize((current) =>
                                      current === size ? null : size
                                    )
                                  }
                                  className="flex w-full min-w-0 items-center justify-between gap-3 rounded-md border border-red-900 bg-[#111] px-4 py-3 text-left text-white disabled:opacity-50"
                                >
                                  {selectedCharacter ? (
                                    <>
                                      <span
                                        className="min-w-0 truncate font-semibold"
                                        style={{
                                          color: getWowClassColor(selectedCharacter.characterClass),
                                        }}
                                      >
                                        {selectedCharacter.name}
                                      </span>
                                      <WowSpecIcons
                                        characterClass={selectedCharacter.characterClass}
                                        mainSpec={selectedCharacter.mainSpec}
                                        offSpec={selectedCharacter.offSpec}
                                      />
                                    </>
                                  ) : (
                                    <span className="text-gray-400">Selecione personagem</span>
                                  )}
                                  <span aria-hidden="true" className="text-gray-400">⌄</span>
                                </button>

                                {openCharacterListSize === size && (
                                  <div
                                    role="listbox"
                                    aria-label={`Personagens para Core ${size}`}
                                    className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-red-900 bg-[#111] p-1 shadow-xl"
                                  >
                                    {characters.map((character) => {
                                      const identity = characterIdentity(
                                        character.name,
                                        character.server
                                      );
                                      const existingSignup = registeredCharacters.get(
                                        `${coreId}:${size}:${identity}`
                                      );
                                      const isSelected =
                                        selectedCharacters[size] === identity;

                                      return (
                                        <button
                                          key={identity}
                                          type="button"
                                          role="option"
                                          aria-selected={isSelected}
                                          disabled={Boolean(existingSignup)}
                                          onClick={() => {
                                            setSelectedCharacters((current) => ({
                                              ...current,
                                              [size]: identity,
                                            }));
                                            setOpenCharacterListSize(null);
                                          }}
                                          className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-50 ${
                                            isSelected ? "bg-red-950/40" : ""
                                          }`}
                                        >
                                          <span className="min-w-0">
                                            <span
                                              className="block truncate font-semibold"
                                              style={{
                                                color: getWowClassColor(character.characterClass),
                                              }}
                                            >
                                              {character.name}
                                            </span>
                                            {existingSignup && (
                                              <span className="block text-xs text-gray-500">
                                                Ja inscrito nesta raid
                                              </span>
                                            )}
                                          </span>
                                          <WowSpecIcons
                                            characterClass={character.characterClass}
                                            mainSpec={character.mainSpec}
                                            offSpec={character.offSpec}
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleSignup(size)}
                        disabled={
                          !selectedCharacters[size] ||
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
                                <span className="flex min-w-0 w-full items-center justify-between gap-2">
                                  <span
                                    className="font-semibold text-white"
                                    style={{ color: getWowClassColor(member.characterClass) }}
                                  >
                                    {member.characterName}
                                  </span>
                                  <WowSpecIcons
                                    characterClass={member.characterClass}
                                    mainSpec={member.mainSpec}
                                    offSpec={member.offSpec}
                                  />
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