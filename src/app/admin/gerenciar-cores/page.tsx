"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { canAccessWowAdmin } from "@/lib/permissions";
import { getWowClassColor } from "@/lib/wow-classes";
import WowSpecIcons from "@/components/wow-spec-icons";
import {
  RAID_CORE_SIZES,
  type RaidCore,
  type RaidCoreId,
  type RaidCoreSize,
  type RaidCoreSignup,
} from "@/lib/raid-cores";
import { fetchJson } from "@/lib/fetch-json";

type SignupAction = "place" | "unplace";

interface SignupDragData {
  signupId: string;
  coreId: string;
  size: number;
  status: string;
}

interface SlotDropData {
  coreId: string;
  size: number;
  slot: number;
  occupantId: string | null;
}

export default function ManageRaidCoresPage() {
  const [signups, setSignups] = useState<RaidCoreSignup[]>([]);
  const [cores, setCores] = useState<RaidCore[]>([]);
  const [newCoreName, setNewCoreName] = useState("");
  const [newCoreSize, setNewCoreSize] = useState<RaidCoreSize>(40);
  const [creatingCore, setCreatingCore] = useState(false);
  const [deletingCoreId, setDeletingCoreId] = useState<string | null>(null);
  const [selectedCore, setSelectedCore] = useState<RaidCoreId>("");
  const [selectedSize, setSelectedSize] = useState<RaidCoreSize>(40);
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
    const [signupList, coreList] = await Promise.all([
      fetchJson<RaidCoreSignup[]>("/api/admin/raid-cores", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetchJson<{ cores: RaidCore[] }>("/api/raid-cores"),
    ]);

    setSignups(signupList);
    setCores(coreList.cores);
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
    slot?: number,
    swapSignupId?: string
  ) => {
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
      await fetchJson("/api/admin/raid-cores", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ signupId: signup.id, action, slot, swapSignupId }),
      });

      await fetchSignups();
      setFeedback(
        action === "place"
          ? swapSignupId
            ? "Posicoes trocadas na composicao."
            : `${signup.characterName} adicionado a composicao.`
          : `${signup.characterName} voltou para a fila.`
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;

    const dragData = active.data.current as SignupDragData | undefined;
    const slotData = over.data.current as SlotDropData | undefined;
    const signup = signups.find((entry) => entry.id === dragData?.signupId);

    if (!dragData || !slotData || !signup) return;
    if (dragData.coreId !== slotData.coreId || dragData.size !== slotData.size) {
      setError("O personagem so pode ser movido dentro do mesmo core e tamanho.");
      return;
    }
    if (slotData.occupantId === signup.id) return;
    if (slotData.occupantId && signup.status !== "selected") {
      setError("Solte o inscrito em uma vaga vazia.");
      return;
    }

    void updateSignup(
      signup,
      "place",
      slotData.slot,
      slotData.occupantId ?? undefined
    );
  };

  const createCore = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setCreatingCore(true);
    setError(null);
    setFeedback(null);

    try {
      const token = await currentUser.getIdToken();
      const result = await fetchJson<{ core: RaidCore }>("/api/admin/raid-cores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCoreName, size: newCoreSize }),
      });

      await fetchSignups();
      setSelectedSize(newCoreSize);
      setSelectedCore(result.core.id);
      setNewCoreName("");
      setFeedback(`${result.core.name} criado.`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Nao foi possivel criar o core."
      );
    } finally {
      setCreatingCore(false);
    }
  };

  const deleteCore = async (core: RaidCore) => {
    if (
      !window.confirm(
        `Excluir "${core.name}"? As inscricoes e a composicao desse core tambem serao apagadas.`
      )
    ) {
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setDeletingCoreId(core.id);
    setError(null);
    setFeedback(null);

    try {
      const token = await currentUser.getIdToken();
      await fetchJson("/api/admin/raid-cores", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ coreId: core.id }),
      });

      await fetchSignups();
      setFeedback(`${core.name} excluido.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Nao foi possivel excluir o core."
      );
    } finally {
      setDeletingCoreId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-400">
        Carregando gerenciamento de cores...
      </div>
    );
  }

  const availableCores = cores.filter((core) => core.size === selectedSize);
  const activeCore =
    availableCores.find((core) => core.id === selectedCore) ?? availableCores[0];
  const activeCoreId = activeCore?.id ?? "";
  const selectedSignups = signups.filter(
    (signup) => signup.coreId === activeCoreId && signup.size === selectedSize
  );
  const placed = selectedSignups.filter(
    (signup) => signup.status === "selected" && signup.slot !== null
  );
  const pending = selectedSignups.filter((signup) => signup.status === "pending");
  const totalGroups = selectedSize / 5;

  return (
    <DndContext onDragEnd={handleDragEnd}>
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

        <section className="mb-8 border-b border-red-900 pb-6">
          <h2 className="mb-3 text-lg font-semibold text-red-300">Criar novo core</h2>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void createCore();
            }}
          >
            <input
              value={newCoreName}
              onChange={(event) => setNewCoreName(event.target.value)}
              maxLength={40}
              required
              placeholder="Nome do core"
              aria-label="Nome do core"
              className="rounded-md border border-red-900 bg-[#111] px-4 py-3 text-white"
            />
            <select
              value={newCoreSize}
              onChange={(event) => setNewCoreSize(Number(event.target.value) as RaidCoreSize)}
              aria-label="Tamanho do novo core"
              className="rounded-md border border-red-900 bg-[#111] px-4 py-3 text-white"
            >
              {RAID_CORE_SIZES.map((size) => (
                <option key={size} value={size}>{size} pessoas</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creatingCore || !newCoreName.trim()}
              className="rounded-md bg-red-700 px-5 py-3 font-semibold transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingCore ? "Criando..." : "Criar core"}
            </button>
          </form>
        </section>

        {cores.length === 0 ? (
          <p className="text-center text-gray-400">
            Nenhum core criado ainda. Crie o primeiro acima.
          </p>
        ) : (
        <>
        <details open className="group mb-8 border-b border-red-900 pb-6">
          <summary className="mb-4 flex cursor-pointer select-none list-none items-center gap-2 text-lg font-semibold text-red-300 [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="transition-transform group-open:rotate-90">▸</span>
            Cores existentes ({cores.length})
          </summary>

          <div className="grid gap-6 lg:grid-cols-3">
            {RAID_CORE_SIZES.map((size) => {
              const sizeCores = cores.filter((core) => core.size === size);

              return (
                <div key={size}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    {size} pessoas ({sizeCores.length})
                  </h3>
                  {sizeCores.length === 0 ? (
                    <p className="text-sm text-gray-600">Nenhum core.</p>
                  ) : (
                    <ul className="space-y-2">
                      {sizeCores.map((core) => {
                        const coreSignups = signups.filter((signup) => signup.coreId === core.id);
                        const placedCount = coreSignups.filter(
                          (signup) => signup.status === "selected"
                        ).length;
                        const isActive = core.id === activeCoreId;

                        return (
                          <li
                            key={core.id}
                            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
                              isActive ? "border-red-500 bg-red-950/40" : "border-red-900 bg-[#111]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSize(core.size);
                                setSelectedCore(core.id);
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span className="block truncate font-semibold text-white">{core.name}</span>
                              <span className="block text-xs text-gray-400">
                                {placedCount}/{core.size} alocados · {coreSignups.length - placedCount} aguardando
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteCore(core)}
                              disabled={deletingCoreId !== null}
                              className="shrink-0 text-sm text-red-300 hover:text-red-200 disabled:opacity-50"
                            >
                              {deletingCoreId === core.id ? "Excluindo..." : "Excluir"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </details>

        <section className="mb-8 grid gap-4 border-b border-red-900 pb-6 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            Core
            <select
              value={activeCoreId}
              onChange={(event) => setSelectedCore(event.target.value as RaidCoreId)}
              className="rounded-md border border-red-900 bg-[#111] px-4 py-3 text-white"
            >
              {availableCores.map((core) => (
                <option key={core.id} value={core.id}>{core.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            Tamanho da raid
            <select
              value={selectedSize}
              onChange={(event) => setSelectedSize(Number(event.target.value) as RaidCoreSize)}
              className="rounded-md border border-red-900 bg-[#111] px-4 py-3 text-white"
            >
              {RAID_CORE_SIZES.map((size) => (
                <option key={size} value={size}>{size} pessoas</option>
              ))}
            </select>
          </label>
        </section>

        {activeCore ? (
        <>
        <section className="mb-10">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 className="text-2xl font-semibold text-red-400">
              {activeCore.name} · Raid {selectedSize}
            </h2>
            <span className="text-sm text-gray-400">
              {placed.length}/{selectedSize} alocados
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: totalGroups }, (_, groupIndex) => (
              <section key={groupIndex}>
                <h3 className="mb-2 text-center text-sm font-semibold text-gray-400">
                  Grupo {groupIndex + 1}
                </h3>
                <ol className="space-y-2">
                  {Array.from({ length: 5 }, (_, memberIndex) => {
                    const slot = groupIndex * 5 + memberIndex + 1;
                    const signup = placed.find((entry) => entry.slot === slot);
                    return (
                      <DroppableRaidSlot
                        key={slot}
                        coreId={activeCoreId}
                        size={selectedSize}
                        slot={slot}
                        signup={signup}
                        disabled={savingId !== null}
                        onUnplace={() => {
                          if (signup) void updateSignup(signup, "unplace");
                        }}
                      />
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </section>

        <section className="border-t border-red-900 pt-8">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 className="text-2xl font-semibold text-red-400">
              Inscritos aguardando
            </h2>
            <span className="text-sm text-gray-400">{pending.length}</span>
          </div>

          {pending.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum inscrito aguardando para esse tamanho.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pending.map((signup) => {
                return (
                  <DraggableSignup key={signup.id} signup={signup}>
                    <div className="border border-white/10 bg-[#141414] p-4 pr-10">
                      <p
                        className="font-semibold text-white"
                        style={{ color: getWowClassColor(signup.characterClass) }}
                      >
                        {signup.characterName}
                      </p>
                      <SpecializationIcons signup={signup} />
                    </div>
                  </DraggableSignup>
                );
              })}
            </div>
          )}
        </section>
        </>
        ) : (
          <p className="text-center text-gray-400">
            Nenhum core criado para {selectedSize} pessoas.
          </p>
        )}
        </>
        )}
      </div>
    </div>
    </DndContext>
  );
}

function DraggableSignup({
  signup,
  children,
}: {
  signup: RaidCoreSignup;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({
      id: `signup-${signup.id}`,
      data: {
        signupId: signup.id,
        coreId: signup.coreId,
        size: signup.size,
        status: signup.status,
      } satisfies SignupDragData,
    });

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      className={`relative ${isDragging ? "z-20 opacity-50" : ""}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastar ${signup.characterName}`}
        title="Arraste para uma vaga da composição"
        className="absolute right-2 top-2 z-10 cursor-grab touch-none text-lg leading-none text-gray-400 hover:text-white active:cursor-grabbing"
      >
        ⠿
      </button>
      {children}
    </div>
  );
}

function DroppableRaidSlot({
  coreId,
  size,
  slot,
  signup,
  disabled,
  onUnplace,
}: {
  coreId: RaidCoreSignup["coreId"];
  size: RaidCoreSignup["size"];
  slot: number;
  signup: RaidCoreSignup | undefined;
  disabled: boolean;
  onUnplace: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${coreId}-${size}-${slot}`,
    data: {
      coreId,
      size,
      slot,
      occupantId: signup?.id ?? null,
    } satisfies SlotDropData,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      className={`flex min-h-9 items-center justify-between gap-2 border px-2 text-xs transition-colors ${
        isOver
          ? "border-red-400 bg-red-950/70"
          : signup
            ? "border-white/10 bg-[#151515]"
            : "border-white/10 bg-[#111]"
      }`}
    >
      {signup ? (
        <DraggableSignup signup={signup}>
          <span className="flex min-h-8 items-center justify-between gap-2 pr-6">
            <span className="min-w-0 truncate">
              <span style={{ color: getWowClassColor(signup.characterClass) }}>
                {signup.characterName}
              </span>
            </span>
            <SpecializationIcons signup={signup} />
            <button
              type="button"
              title="Desalocar e devolver a inscricao para a fila"
              onClick={onUnplace}
              disabled={disabled}
              className="shrink-0 text-amber-300 hover:text-amber-200 disabled:opacity-50"
            >
              Desalocar
            </button>
          </span>
        </DraggableSignup>
      ) : (
        <span className="text-gray-600">Vaga {slot}</span>
      )}
    </li>
  );
}

function SpecializationIcons({ signup }: { signup: RaidCoreSignup }) {
  return (
    <WowSpecIcons
      characterClass={signup.characterClass}
      mainSpec={signup.mainSpec}
      offSpec={signup.offSpec}
    />
  );
}