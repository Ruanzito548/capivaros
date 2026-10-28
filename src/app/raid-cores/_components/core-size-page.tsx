"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WowSpecIcons from "@/components/wow-spec-icons";
import { fetchJson } from "@/lib/fetch-json";
import { getWowClassColor } from "@/lib/wow-classes";
import type { RaidCore, RaidCoreSignup, RaidCoreSize } from "@/lib/raid-cores";

export default function CoreSizePage({ size }: { size: RaidCoreSize }) {
  const [cores, setCores] = useState<RaidCore[]>([]);
  const [rosters, setRosters] = useState<Record<string, RaidCoreSignup[]>>({});
  const [openCoreId, setOpenCoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchJson<{ cores: RaidCore[] }>("/api/raid-cores")
      .then(async ({ cores: allCores }) => {
        const sizeCores = allCores.filter((core) => core.size === size);
        const entries = await Promise.all(
          sizeCores.map(async (core) => {
            const data = await fetchJson<{ roster?: RaidCoreSignup[] }>(`/api/raid-cores/${core.id}`);
            return [core.id, (data.roster ?? []).filter((member) => member.size === size)] as const;
          })
        );

        if (!cancelled) {
          setCores(sizeCores);
          setRosters(Object.fromEntries(entries));
          setOpenCoreId(sizeCores[0]?.id ?? null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar os inscritos.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [size]);

  const openCore = cores.find((core) => core.id === openCoreId) ?? null;
  const openRoster = openCore ? rosters[openCore.id] ?? [] : [];
  const totalPlaced = cores.reduce((sum, core) => sum + (rosters[core.id]?.length ?? 0), 0);

  return (
    <div className="min-h-screen bg-transparent px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/raid-cores"
          className="mb-6 inline-block text-sm text-gray-400 underline hover:text-red-400"
        >
          Voltar para cores
        </Link>

        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-red-500 drop-shadow-[0_0_14px_rgba(255,37,47,0.5)] sm:text-5xl">
            Cores {size}
          </h1>
          {!loading && !error && cores.length > 0 && (
            <p className="mt-3 text-gray-400">
              {cores.length} {cores.length === 1 ? "core" : "cores"} · {totalPlaced} jogadores alocados
            </p>
          )}
        </header>

        {error && (
          <p role="alert" className="mb-6 text-center text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-center text-red-400">Carregando cores...</p>
        ) : cores.length === 0 ? (
          !error && (
            <p className="text-center text-gray-400">Nenhum core criado para {size} pessoas.</p>
          )
        ) : (
          <>
            <div
              role="group"
              aria-label={`Cores de ${size} pessoas`}
              className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {cores.map((core) => {
                const count = rosters[core.id]?.length ?? 0;
                const expanded = core.id === openCoreId;

                return (
                  <button
                    key={core.id}
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`core-panel-${core.id}`}
                    onClick={() => setOpenCoreId(expanded ? null : core.id)}
                    className={`rounded-lg border p-4 text-left transition ${
                      expanded
                        ? "border-[#ff252f] bg-red-950/50 shadow-[0_0_18px_rgba(255,37,47,0.3)]"
                        : "border-red-900 bg-[#0d0d0d] hover:border-red-600 hover:bg-red-950/20"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xl font-semibold text-red-300">{core.name}</span>
                      <span
                        aria-hidden="true"
                        className={`text-red-400 transition-transform ${expanded ? "rotate-90" : ""}`}
                      >
                        ▸
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-gray-400">
                      {count}/{size} alocados
                    </span>
                    <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full bg-[#ff252f]"
                        style={{ width: `${Math.min(100, (count / size) * 100)}%` }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            {openCore && (
              <section
                id={`core-panel-${openCore.id}`}
                className="rounded-lg border border-red-900 bg-[#0b0b0b] p-4 sm:p-6"
              >
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-red-950 pb-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-red-400">{openCore.name}</h2>
                    <p className="text-sm text-gray-400">
                      {openRoster.length}/{size} vagas montadas
                      {openRoster.length >= size && (
                        <span className="ml-2 text-emerald-300">· Composicao completa</span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/raid-cores/${openCore.id}?tamanho=${size}`}
                    className="rounded-md bg-red-700 px-5 py-2 font-semibold transition hover:bg-red-600"
                  >
                    Inscrever-se
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: size / 5 }, (_, groupIndex) => (
                    <div
                      key={groupIndex}
                      className="rounded-md border border-white/10 bg-[#111] p-3"
                    >
                      <h3 className="mb-2 text-center text-sm font-semibold text-gray-400">
                        Grupo {groupIndex + 1}
                      </h3>
                      <ol className="space-y-1">
                        {Array.from({ length: 5 }, (_, memberIndex) => {
                          const slot = groupIndex * 5 + memberIndex + 1;
                          const member = openRoster.find((candidate) => candidate.slot === slot);

                          return (
                            <li
                              key={slot}
                              className="flex min-h-11 items-center gap-2 rounded border border-white/5 bg-[#0b0b0b] px-3 text-sm"
                            >
                              {member ? (
                                <>
                                  <span
                                    className="min-w-0 flex-1 truncate font-semibold"
                                    style={{ color: getWowClassColor(member.characterClass) }}
                                  >
                                    {member.characterName}
                                  </span>
                                  <WowSpecIcons
                                    characterClass={member.characterClass}
                                    mainSpec={member.mainSpec}
                                    offSpec={member.offSpec}
                                  />
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
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
