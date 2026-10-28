"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WowSpecIcons from "@/components/wow-spec-icons";
import { getWowClassColor } from "@/lib/wow-classes";
import { fetchJson } from "@/lib/fetch-json";
import {
  type RaidCore,
  type RaidCoreSignup,
  type RaidCoreSize,
} from "@/lib/raid-cores";

export default function CoreSizePage({ size }: { size: RaidCoreSize }) {
  const [cores, setCores] = useState<RaidCore[]>([]);
  const [rosters, setRosters] = useState<Record<string, RaidCoreSignup[]>>({});
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
          Cores {size}
        </h1>

        {error && (
          <p role="alert" className="mb-6 text-center text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-center text-red-400">Carregando inscritos...</p>
        ) : cores.length === 0 ? (
          <p className="text-center text-gray-400">Nenhum core criado para {size} pessoas.</p>
        ) : (
          <div className="space-y-10">
            {cores.map((core) => {
              const roster = rosters[core.id] ?? [];

              return (
                <section key={core.id} className="border-t border-red-900 pt-8">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-red-400">
                      {core.name} · {size} pessoas
                    </h2>
                    <Link
                      href={`/raid-cores/${core.id}?tamanho=${size}`}
                      className="rounded-md bg-red-700 px-4 py-2 font-semibold transition hover:bg-red-600"
                    >
                      Inscrever-se
                    </Link>
                  </div>

                  <details open className="group">
                    <summary className="mb-4 flex cursor-pointer select-none list-none items-center gap-2 text-lg font-semibold text-red-300 [&::-webkit-details-marker]:hidden">
                      <span aria-hidden="true" className="transition-transform group-open:rotate-90">▸</span>
                      Inscritos ({roster.length}/{size})
                    </summary>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {Array.from({ length: size / 5 }, (_, groupIndex) => (
                        <div key={groupIndex}>
                          <h3 className="mb-2 text-center text-sm font-semibold text-gray-400">
                            Grupo {groupIndex + 1}
                          </h3>
                          <ol className="space-y-1">
                            {Array.from({ length: 5 }, (_, memberIndex) => {
                              const slot = groupIndex * 5 + memberIndex + 1;
                              const member = roster.find((candidate) => candidate.slot === slot);

                              return (
                                <li
                                  key={slot}
                                  className="flex min-h-11 items-center border border-white/10 bg-[#111] px-3 text-sm"
                                >
                                  {member ? (
                                    <span className="flex w-full min-w-0 items-center justify-between gap-2">
                                      <span
                                        className="font-semibold"
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
                  </details>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
