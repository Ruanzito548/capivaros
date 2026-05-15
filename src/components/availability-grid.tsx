"use client";

import { useState } from "react";

export const DAYS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export const PERIODS = [
  { label: "Manhã", hours: "07 - 12h", slots: [7, 8, 9, 10, 11, 12] },
  { label: "Tarde", hours: "13 - 18h", slots: [13, 14, 15, 16, 17, 18] },
  { label: "Noite", hours: "19 - 00h", slots: [19, 20, 21, 22, 23, 0] },
  { label: "Madrugada", hours: "01 - 06h", slots: [1, 2, 3, 4, 5, 6] },
];

export const HOURS_PER_PERIOD = PERIODS[0].slots.length;
export const LEGACY_FLAT_LENGTH = DAYS.length * PERIODS.length;
export const HOURLY_FLAT_LENGTH = LEGACY_FLAT_LENGTH * HOURS_PER_PERIOD;

// availability[dayIndex][periodIndex][hourIndex] = true/false
export type Availability = boolean[][][];

function createEmptyPeriodHours() {
  return Array(HOURS_PER_PERIOD).fill(false);
}

function formatHourRangeLabel(startHour: number) {
  const endHour = (startHour + 1) % 24;
  return `${String(startHour).padStart(2, "0")}:00 as ${String(endHour).padStart(2, "0")}:00`;
}

export function createEmptyAvailability(): Availability {
  return Array.from({ length: DAYS.length }, () =>
    Array.from({ length: PERIODS.length }, () => createEmptyPeriodHours())
  );
}

export function availabilityToFlat(grid: Availability): boolean[] {
  return grid.flat(2);
}

export function flatToAvailability(flat: boolean[]): Availability {
  if (!Array.isArray(flat)) {
    return createEmptyAvailability();
  }

  if (flat.length === HOURLY_FLAT_LENGTH && flat.every((v) => typeof v === "boolean")) {
    return Array.from({ length: DAYS.length }, (_, d) =>
      Array.from({ length: PERIODS.length }, (_, p) =>
        Array.from(
          { length: HOURS_PER_PERIOD },
          (_, h) => flat[d * PERIODS.length * HOURS_PER_PERIOD + p * HOURS_PER_PERIOD + h] ?? false
        )
      )
    );
  }

  // Backward compatibility with old format (1 boolean per period):
  // if period was true, consider all hours selected by default.
  if (flat.length === LEGACY_FLAT_LENGTH && flat.every((v) => typeof v === "boolean")) {
    return Array.from({ length: DAYS.length }, (_, d) =>
      Array.from({ length: PERIODS.length }, (_, p) => {
        const active = flat[d * PERIODS.length + p] ?? false;
        return Array.from({ length: HOURS_PER_PERIOD }, () => active);
      })
    );
  }

  return createEmptyAvailability();
}

interface Props {
  value: Availability;
  onChange?: (next: Availability) => void;
  readonly?: boolean;
  enableReadonlyDetails?: boolean;
}

export default function AvailabilityGrid({
  value,
  onChange,
  readonly = false,
  enableReadonlyDetails = false,
}: Props) {
  const [editor, setEditor] = useState<{
    dayIndex: number;
    periodIndex: number;
    draftHours: boolean[];
  } | null>(null);
  const [viewer, setViewer] = useState<{
    dayIndex: number;
    periodIndex: number;
    hours: boolean[];
  } | null>(null);

  const openEditor = (d: number, p: number) => {
    if (readonly || !onChange) return;
    const currentHours = value[d]?.[p] ?? createEmptyPeriodHours();
    setEditor({
      dayIndex: d,
      periodIndex: p,
      draftHours: [...currentHours],
    });
  };

  const openReadonlyViewer = (d: number, p: number) => {
    if (!readonly || !enableReadonlyDetails) return;
    const currentHours = value[d]?.[p] ?? createEmptyPeriodHours();
    setViewer({
      dayIndex: d,
      periodIndex: p,
      hours: [...currentHours],
    });
  };

  const toggleHourInEditor = (hourIndex: number) => {
    if (!editor) return;
    setEditor({
      ...editor,
      draftHours: editor.draftHours.map((selected, i) =>
        i === hourIndex ? !selected : selected
      ),
    });
  };

  const setAllHoursInEditor = (selected: boolean) => {
    if (!editor) return;
    setEditor({
      ...editor,
      draftHours: editor.draftHours.map(() => selected),
    });
  };

  const saveEditor = () => {
    if (!editor || !onChange) return;
    const next = value.map((day, di) =>
      day.map((periodHours, pi) => {
        if (di !== editor.dayIndex || pi !== editor.periodIndex) {
          return periodHours;
        }

        return [...editor.draftHours];
      })
    );
    onChange(next);
    setEditor(null);
  };

  return (
    <div className="w-full relative">
      <table className="w-full border-collapse table-fixed text-sm select-none">
        <thead>
          <tr>
            <th className="w-24 pb-3 pr-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:w-28 sm:pr-3 sm:text-xs">
              Período
            </th>
            {DAYS.map((day) => (
              <th
                key={day}
                className="pb-3 px-1 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((period, p) => (
            <tr key={period.label}>
              <td className="py-2 pr-3 align-middle">
                <div className="flex flex-col">
                  <span className="font-semibold text-red-400">{period.label}</span>
                  <span className="text-xs text-gray-500">{period.hours}</span>
                </div>
              </td>
              {DAYS.map((_, d) => {
                const selectedHours = value[d]?.[p] ?? createEmptyPeriodHours();
                const selectedCount = selectedHours.filter(Boolean).length;
                const active = selectedCount > 0;
                const canClick = !readonly || enableReadonlyDetails;
                return (
                  <td key={d} className="py-2 px-1 text-center align-middle">
                    <button
                      type="button"
                      aria-label={`${DAYS[d]} ${period.label} ${active ? "disponível" : "indisponível"}`}
                      onClick={() => {
                        if (readonly) {
                          openReadonlyViewer(d, p);
                          return;
                        }

                        openEditor(d, p);
                      }}
                      disabled={!canClick}
                      className={[
                        "mx-auto flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-all duration-150 sm:h-10 sm:w-10 sm:text-base md:h-12 md:w-12 md:text-lg",
                        canClick ? "cursor-pointer" : "cursor-default",
                        active
                          ? "border-red-600 bg-red-600/30 shadow-[0_0_8px_rgba(220,38,38,0.5)]"
                          : "border-red-900/40 bg-[#1c1c1c] hover:border-red-700 hover:bg-red-900/10",
                      ].join(" ")}
                    >
                      {selectedCount > 0 ? (
                        <span aria-hidden="true" className="text-[10px] font-bold sm:text-xs md:text-sm">
                          {selectedCount}/{HOURS_PER_PERIOD}
                        </span>
                      ) : (
                        <span aria-hidden="true" className="opacity-0">
                          0/{HOURS_PER_PERIOD}
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {!readonly && (
        <p className="mt-3 text-xs text-gray-500">
          Clique no quadrado do período para escolher os horários exatos.
        </p>
      )}

      {readonly && enableReadonlyDetails && (
        <p className="mt-3 text-xs text-gray-500">
          Clique no quadrado do período para ver os horários selecionados.
        </p>
      )}

      {!readonly && editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-900 bg-[#141414] p-6 shadow-[0_0_25px_rgba(220,38,38,0.35)]">
            <h3 className="text-xl font-bold text-red-400">
              {DAYS[editor.dayIndex]} - {PERIODS[editor.periodIndex].label}
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Selecione os horários em que você está disponível.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {PERIODS[editor.periodIndex].slots.map((hour, hourIndex) => {
                const selected = editor.draftHours[hourIndex] ?? false;
                const hourLabel = formatHourRangeLabel(hour);

                return (
                  <button
                    key={`${hourLabel}-${hourIndex}`}
                    type="button"
                    onClick={() => toggleHourInEditor(hourIndex)}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                      selected
                        ? "border-red-500 bg-red-600/30 text-white shadow-[0_0_12px_rgba(220,38,38,0.45)]"
                        : "border-red-900/50 bg-[#1c1c1c] text-gray-300 hover:border-red-700 hover:text-white",
                    ].join(" ")}
                  >
                    {hourLabel}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAllHoursInEditor(true)}
                className="rounded-lg border border-red-800 px-3 py-2 text-xs text-red-300 transition hover:border-red-600 hover:text-white"
              >
                Marcar todos
              </button>
              <button
                type="button"
                onClick={() => setAllHoursInEditor(false)}
                className="rounded-lg border border-red-800 px-3 py-2 text-xs text-red-300 transition hover:border-red-600 hover:text-white"
              >
                Limpar todos
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-gray-300 transition hover:border-zinc-500 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEditor}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {readonly && enableReadonlyDetails && viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-900 bg-[#141414] p-6 shadow-[0_0_25px_rgba(220,38,38,0.35)]">
            <h3 className="text-xl font-bold text-red-400">
              {DAYS[viewer.dayIndex]} - {PERIODS[viewer.periodIndex].label}
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Horários selecionados pelo jogador.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {PERIODS[viewer.periodIndex].slots.map((hour, hourIndex) => {
                const selected = viewer.hours[hourIndex] ?? false;
                const hourLabel = formatHourRangeLabel(hour);

                return (
                  <div
                    key={`${hourLabel}-${hourIndex}`}
                    className={[
                      "rounded-lg border px-3 py-2 text-center text-sm font-semibold",
                      selected
                        ? "border-red-500 bg-red-600/30 text-white"
                        : "border-red-900/50 bg-[#1c1c1c] text-gray-500",
                    ].join(" ")}
                  >
                    {hourLabel}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
