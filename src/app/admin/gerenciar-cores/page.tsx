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
  const [expandedCoreIds, setExpandedCoreIds] = useState<Set<string>>(new Set());
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
      setExpandedCoreIds((current) => new Set(current).add(result.core.id));
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

  const toggleCore = (coreId: string) => {
    setExpandedCoreIds((current) => {
      const next = new Set(current);
      if (!next.delete(coreId)) next.add(coreId);
      return next;
    });
  };

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
        <section className="space-y-8">
          {RAID_CORE_SIZES.map((size) => {
            const sizeCores = cores.filter((core) => core.size === size);
            if (sizeCores.length === 0) return null;

            return (
              <div key={size}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Cores de {size} pessoas ({sizeCores.length})
                </h2>
                <ul className="space-y-3">
                  {sizeCores.map((core) => {
                    const coreSignups = signups.filter(
                      (signup) => signup.coreId === core.id && signup.size === core.size
                    );
                    const placedCount = coreSignups.filter(
                      (signup) => signup.status === "selected" && signup.slot !== null
                    ).length;
                    const expanded = expandedCoreIds.has(core.id);

                    return (
                      <li key={core.id} className="rounded-md border border-red-900 bg-[#0d0d0d]">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-red-300">{core.name}</p>
                            <p className="text-xs text-gray-400">
                              {placedCount}/{core.size} alocados · {coreSignups.length - placedCount} aguardando
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-expanded={expanded}
                              onClick={() => toggleCore(core.id)}
                              className="rounded-md border border-red-800 px-3 py-1.5 text-sm font-semibold text-red-200 transition hover:bg-red-950"
                            >
                              {expanded ? "Minimizar" : "Expandir"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteCore(core)}
                              disabled={deletingCoreId !== null}
                              className="rounded-md px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-950 disabled:opacity-50"
                            >
                              {deletingCoreId === core.id ? "Excluindo..." : "Excluir"}
                            </button>
                          </div>
                        </div>

                        {expanded && (
                          <div className="border-t border-red-950 px-4 py-5">
                            <CoreComposition
                              core={core}
                              signups={coreSignups}
                              disabled={savingId !== null}
                              onUnplace={(signup) => void updateSignup(signup, "unplace")}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
        </>
        )}
      </div>
    </div>
    </DndContext>
  );
}

function CoreComposition({
  core,
  signups,
  disabled,
  onUnplace,
}: {
  core: RaidCore;
  signups: RaidCoreSignup[];
  disabled: boolean;
  onUnplace: (signup: RaidCoreSignup) => void;
}) {
  const placed = signups.filter(
    (signup) => signup.status === "selected" && signup.slot !== null
  );
  const pending = signups.filter((signup) => signup.status === "pending");

  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: core.size / 5 }, (_, groupIndex) => (
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
                    coreId={core.id}
                    size={core.size}
                    slot={slot}
                    signup={signup}
                    disabled={disabled}
                    onUnplace={() => {
                      if (signup) onUnplace(signup);
                    }}
                  />
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-red-300">
          Inscritos aguardando ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum inscrito aguardando.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pending.map((signup) => (
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
            ))}
          </div>
        )}
      </div>
    </div>
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