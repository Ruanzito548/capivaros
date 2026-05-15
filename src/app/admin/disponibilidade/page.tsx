"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { canAccessWowAdmin } from "@/lib/permissions";
import {
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
}

export default function AdminDisponibilidade() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [results, setResults] = useState<PlayerResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/"); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists() || !canAccessWowAdmin(snap.data()?.role)) { router.push("/"); return; }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleSearch = async () => {
    if (selectedDay === null || selectedPeriod === null) return;

    setSearching(true);
    setResults(null);

    const snap = await getDocs(collection(db, "users"));
    const matched: PlayerResult[] = [];

    for (const userDoc of snap.docs) {
      const data = userDoc.data();
      if (!data.username) continue;

      const flat = data.availability;
      if (
        !Array.isArray(flat) ||
        (flat.length !== LEGACY_FLAT_LENGTH && flat.length !== HOURLY_FLAT_LENGTH)
      ) {
        continue;
      }

      const grid = flatToAvailability(flat as boolean[]);
      const selectedHours = grid[selectedDay]?.[selectedPeriod] ?? [];
      if (selectedHours.some(Boolean)) {
        matched.push({
          username: data.username,
          photoURL: data.photoURL,
          role: data.role,
        });
      }
    }

    setResults(matched.sort((a, b) => a.username.localeCompare(b.username)));
    setSearching(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        Verificando permissoes...
      </div>
    );
  }

  const canSearch = selectedDay !== null && selectedPeriod !== null;

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
          Selecione um dia e período para ver quais jogadores estão disponíveis.
        </p>

        {/* Seletor de dia */}
        <div className="mb-8">
          <p className="text-red-400 font-semibold mb-3">Dia da semana</p>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((day, i) => (
              <button
                key={day}
                onClick={() => setSelectedDay(i)}
                className={[
                  "px-5 py-2 rounded-xl border text-sm font-semibold transition",
                  selectedDay === i
                    ? "border-red-500 bg-red-600/30 text-white shadow-[0_0_12px_rgba(220,38,38,0.5)]"
                    : "border-red-900/50 bg-[#141414] text-gray-400 hover:border-red-700 hover:text-white",
                ].join(" ")}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Seletor de período */}
        <div className="mb-10">
          <p className="text-red-400 font-semibold mb-3">Período</p>
          <div className="flex flex-wrap gap-3">
            {PERIODS.map((period, i) => (
              <button
                key={period.label}
                onClick={() => setSelectedPeriod(i)}
                className={[
                  "flex flex-col items-start px-5 py-3 rounded-xl border text-sm font-semibold transition",
                  selectedPeriod === i
                    ? "border-red-500 bg-red-600/30 text-white shadow-[0_0_12px_rgba(220,38,38,0.5)]"
                    : "border-red-900/50 bg-[#141414] text-gray-400 hover:border-red-700 hover:text-white",
                ].join(" ")}
              >
                <span>{period.label}</span>
                <span className="text-xs font-normal opacity-70">{period.hours}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={!canSearch || searching}
          className="mb-12 px-8 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold shadow-[0_0_15px_rgba(220,38,38,0.5)] transition"
        >
          {searching ? "Buscando..." : "Ver jogadores disponíveis"}
        </button>

        {/* Resultado */}
        {results !== null && (
          <div>
            <h2 className="text-2xl font-bold text-red-400 mb-6">
              {results.length > 0
                ? `${results.length} jogador${results.length > 1 ? "es" : ""} disponível${results.length > 1 ? "is" : ""}`
                : "Nenhum jogador disponível neste horário"}
              {selectedDay !== null && selectedPeriod !== null && (
                <span className="ml-3 text-base font-normal text-gray-400">
                  — {DAYS[selectedDay]}, {PERIODS[selectedPeriod].label} ({PERIODS[selectedPeriod].hours})
                </span>
              )}
            </h2>

            {results.length > 0 && (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {results.map((player) => (
                  <Link
                    key={player.username}
                    href={`/perfil/${player.username}`}
                    className="flex items-center gap-4 bg-[#141414] border border-red-900 rounded-xl px-5 py-4 hover:border-red-600 hover:bg-red-900/10 transition"
                  >
                    <img
                      src={player.photoURL || "/capilogo.png"}
                      alt={player.username}
                      className="h-11 w-11 rounded-full border border-red-800 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{player.username}</p>
                      {player.role && (
                        <p className="text-xs text-gray-500 truncate capitalize">{player.role}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
