"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { canAccessWowAdmin } from "@/lib/permissions";
import {
  Availability,
  DAYS,
  PERIODS,
  flatToAvailability,
  LEGACY_FLAT_LENGTH,
  HOURLY_FLAT_LENGTH,
} from "@/components/availability-grid";

interface PlayerResult {
  username: string;
  photoURL?: string;
  role?: string;
  availability: Availability;
}

function formatHourRangeLabel(startHour: number) {
  const endHour = (startHour + 1) % 24;
  return `${String(startHour).padStart(2, "0")}:00 as ${String(endHour).padStart(2, "0")}:00`;
}

export default function AdminDisponibilidade() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [details, setDetails] = useState<{ dayIndex: number; periodIndex: number } | null>(
    null
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/"); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists() || !canAccessWowAdmin(snap.data()?.role)) { router.push("/"); return; }

      const usersSnapshot = await getDocs(collection(db, "users"));
      const loadedPlayers: PlayerResult[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const data = userDoc.data();
        if (!data.username) continue;

        const flat = data.availability;
        if (
          !Array.isArray(flat) ||
          (flat.length !== LEGACY_FLAT_LENGTH && flat.length !== HOURLY_FLAT_LENGTH)
        ) {
          continue;
        }

        loadedPlayers.push({
          username: data.username,
          photoURL: data.photoURL,
          role: data.role,
          availability: flatToAvailability(flat as boolean[]),
        });
      }

      setPlayers(loadedPlayers.sort((a, b) => a.username.localeCompare(b.username)));
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const getCellPlayerCount = (dayIndex: number, periodIndex: number) => {
    return players.filter((player) =>
      (player.availability[dayIndex]?.[periodIndex] ?? []).some(Boolean)
    ).length;
  };

  const hourlyResults = details
    ? PERIODS[details.periodIndex].slots.map((hour, hourIndex) => {
        const hourPlayers = players.filter(
          (player) => player.availability[details.dayIndex]?.[details.periodIndex]?.[hourIndex]
        );

        return {
          hour,
          players: hourPlayers,
        };
      })
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        Verificando permissoes...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/admin")}
          className="mb-8 text-sm text-gray-400 transition hover:text-red-400"
        >
          ← Voltar ao Painel Admin
        </button>

        <h1 className="text-4xl font-bold text-red-500 mb-2 drop-shadow-[0_0_15px_rgba(255,0,0,0.7)]">
          Checar Disponibilidade
        </h1>
        <p className="text-gray-400 mb-12 text-sm">
          Clique em um quadrado da tabela para abrir os horários do período e ver quem marcou cada hora.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-red-900 bg-[#141414] p-4">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-36 px-2 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                  Período
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="px-2 py-3 text-center text-xs uppercase tracking-wider text-gray-400"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period, periodIndex) => (
                <tr key={period.label}>
                  <td className="px-2 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-red-400">{period.label}</span>
                      <span className="text-xs text-gray-500">{period.hours}</span>
                    </div>
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const count = getCellPlayerCount(dayIndex, periodIndex);
                    return (
                      <td key={`${period.label}-${dayIndex}`} className="px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setDetails({ dayIndex, periodIndex })}
                          className={[
                            "mx-auto flex h-12 w-12 items-center justify-center rounded-lg border text-xs font-bold transition",
                            count > 0
                              ? "border-red-500 bg-red-600/30 text-white shadow-[0_0_10px_rgba(220,38,38,0.45)]"
                              : "border-red-900/50 bg-[#1c1c1c] text-gray-500 hover:border-red-700 hover:text-white",
                          ].join(" ")}
                          title={`${count} jogador(es) com pelo menos um horário marcado`}
                        >
                          {count}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {details && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-red-900 bg-[#141414] p-6 shadow-[0_0_25px_rgba(220,38,38,0.35)]">
              <h2 className="text-2xl font-bold text-red-400">
                {DAYS[details.dayIndex]} - {PERIODS[details.periodIndex].label}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Horários: {PERIODS[details.periodIndex].hours}
              </p>

              <div className="mt-6 space-y-4">
                {hourlyResults.map(({ hour, players: hourPlayers }) => {
                  const hourLabel = formatHourRangeLabel(hour);
                  return (
                    <div
                      key={hourLabel}
                      className="rounded-xl border border-red-900/50 bg-black/20 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-red-300">{hourLabel}</h3>
                        <span className="text-xs text-gray-400">
                          {hourPlayers.length} jogador{hourPlayers.length !== 1 ? "es" : ""}
                        </span>
                      </div>

                      {hourPlayers.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {hourPlayers.map((player) => (
                            <Link
                              key={`${hourLabel}-${player.username}`}
                              href={`/perfil/${player.username}`}
                              className="flex items-center gap-3 rounded-lg border border-red-900/50 bg-[#171717] px-3 py-2 transition hover:border-red-600 hover:bg-red-900/10"
                            >
                              <img
                                src={player.photoURL || "/capilogo.png"}
                                alt={player.username}
                                className="h-9 w-9 rounded-full border border-red-800 object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-white">{player.username}</p>
                                {player.role && (
                                  <p className="truncate text-xs text-gray-500 capitalize">{player.role}</p>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum jogador marcou este horário.</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetails(null)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
