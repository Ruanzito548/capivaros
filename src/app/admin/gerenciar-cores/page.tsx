"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { canAccessWowAdmin } from "@/lib/permissions";
import {
  RAID_CORE_IDS,
  RAID_CORE_SIZES,
  type RaidCoreSignup,
} from "@/lib/raid-cores";

type SignupAction = "place" | "unplace" | "remove";

export default function ManageRaidCoresPage() {
  const [signups, setSignups] = useState<RaidCoreSignup[]>([]);
  const [slotSelections, setSlotSelections] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  const fetchSignups = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    const token = await currentUser.getIdToken();
    const response = await fetch("/api/admin/raid-cores", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json()) as
      | RaidCoreSignup[]
      | { error?: string };

    if (!response.ok || !Array.isArray(result)) {
      throw new Error(
        !Array.isArray(result) && result.error
          ? result.error
          : "Nao foi possivel carregar as inscricoes."
      );
    }

    setSignups(result);
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));
        if (!userSnapshot.exists() || !canAccessWowAdmin(userSnapshot.data().role ?? null)) {
          router.replace("/");
          return;
        }

        await fetchSignups();
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar as inscricoes."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchSignups, router]);

  const updateSignup = async (
    signup: RaidCoreSignup,
    action: SignupAction,
    slot?: number
  ) => {
    if (action === "remove" && !window.confirm(`Remover a inscricao de ${signup.characterName}?`)) {
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setSavingId(signup.id);
    setError(null);
    setFeedback(null);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/admin/raid-cores", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ signupId: signup.id, action, slot }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Nao foi possivel atualizar a composicao.");
      }

      await fetchSignups();
      setFeedback(
        action === "place"
          ? `${signup.characterName} adicionado a composicao.`
          : action === "unplace"
            ? `${signup.characterName} voltou para a fila.`
            : `Inscricao de ${signup.characterName} removida.`
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Nao foi possivel atualizar a composicao."
      );
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-400">
        Carregando gerenciamento de cores...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mb-6 text-sm text-gray-400 underline hover:text-red-400"
        >
          Voltar para Admin
        </button>

        <h1 className="mb-8 text-center text-4xl font-bold text-red-500">
          Gerenciamento de Core
        </h1>

        {(error || feedback) && (
          <p
            role={error ? "alert" : "status"}
            className={`mb-6 text-center ${error ? "text-red-300" : "text-emerald-300"}`}
          >
            {error || feedback}
          </p>
        )}

        <div className="space-y-12">
          {RAID_CORE_IDS.map((coreId) => (
            <section key={coreId} className="border-t border-red-900 pt-8">
              <h2 className="mb-6 text-3xl font-semibold text-red-400">
                Core {coreId}
              </h2>

              <div className="grid gap-6 xl:grid-cols-3">
                {RAID_CORE_SIZES.map((size) => {
                  const groupSignups = signups.filter(
                    (signup) => signup.coreId === coreId && signup.size === size
                  );
                  const placed = groupSignups.filter(
                    (signup) => signup.status === "selected" && signup.slot !== null
                  );
                  const pending = groupSignups.filter(
                    (signup) => signup.status === "pending"
                  );
                  const totalGroups = size / 5;

                  return (
                    <section
                      key={size}
                      className="min-w-0 border border-red-950 bg-[#0d0d0d] p-4"
                    >
                      <div className="mb-4 flex items-baseline justify-between gap-2">
                        <h3 className="text-xl font-semibold text-red-300">
                          {size} pessoas
                        </h3>
                        <span className="text-xs text-gray-500">
                          {placed.length}/{size}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        {Array.from({ length: totalGroups }, (_, groupIndex) => (
                          <div key={groupIndex}>
                            <h4 className="mb-1 text-center text-xs text-gray-500">
                              Grupo {groupIndex + 1}
                            </h4>
                            <ol className="space-y-1">
                              {Array.from({ length: 5 }, (_, memberIndex) => {
                                const slot = groupIndex * 5 + memberIndex + 1;
                                const signup = placed.find((entry) => entry.slot === slot);
                                return (
                                  <li
                                    key={slot}
                                    className="flex min-h-9 items-center justify-between gap-2 border border-white/10 bg-[#151515] px-2 text-xs"
                                  >
                                    {signup ? (
                                      <>
                                        <span className="min-w-0 truncate">
                                          {signup.characterName}
                                          <span className="ml-1 text-gray-500">
                                            {signup.username}
                                          </span>
                                        </span>
                                        <button
                                          type="button"
                                          title="Desalocar e devolver a inscricao para a fila"
                                          onClick={() => void updateSignup(signup, "unplace")}
                                          disabled={savingId !== null}
                                          className="shrink-0 text-amber-300 hover:text-amber-200 disabled:opacity-50"
                                        >
                                          Desalocar
                                        </button>
                                      </>
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

                      <div className="mt-6 border-t border-red-950 pt-4">
                        <h4 className="mb-3 text-sm font-semibold text-gray-300">
                          Inscritos ({pending.length})
                        </h4>
                        {pending.length === 0 ? (
                          <p className="text-xs text-gray-600">Nenhum inscrito aguardando.</p>
                        ) : (
                          <div className="space-y-3">
                            {pending.map((signup) => {
                              const availableSlots = Array.from(
                                { length: size },
                                (_, index) => index + 1
                              ).filter(
                                (slot) => !placed.some((entry) => entry.slot === slot)
                              );
                              const selectedSlot =
                                slotSelections[signup.id] ?? availableSlots[0] ?? "";

                              return (
                                <div
                                  key={signup.id}
                                  className="border border-white/10 bg-[#141414] p-3"
                                >
                                  <p className="mb-1 font-semibold text-white">
                                    {signup.characterName}
                                  </p>
                                  <p className="mb-3 text-xs text-gray-500">
                                    {signup.username} · {signup.server}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <select
                                      aria-label={`Slot para ${signup.characterName}`}
                                      value={selectedSlot}
                                      onChange={(event) =>
                                        setSlotSelections((current) => ({
                                          ...current,
                                          [signup.id]: Number(event.target.value),
                                        }))
                                      }
                                      disabled={availableSlots.length === 0 || savingId !== null}
                                      className="min-w-0 flex-1 rounded border border-red-950 bg-[#0b0b0b] px-2 py-2 text-xs text-white"
                                    >
                                      {availableSlots.length === 0 ? (
                                        <option value="">Composicao cheia</option>
                                      ) : (
                                        availableSlots.map((slot) => (
                                          <option key={slot} value={slot}>
                                            Grupo {Math.ceil(slot / 5)} · Vaga {slot}
                                          </option>
                                        ))
                                      )}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void updateSignup(signup, "place", Number(selectedSlot))
                                      }
                                      disabled={availableSlots.length === 0 || savingId !== null}
                                      className="rounded bg-red-800 px-3 py-2 text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                                    >
                                      {savingId === signup.id ? "Salvando..." : "Alocar"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void updateSignup(signup, "remove")}
                                      disabled={savingId !== null}
                                      className="rounded border border-red-900 px-3 py-2 text-xs text-red-300 hover:bg-red-950 disabled:opacity-50"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}