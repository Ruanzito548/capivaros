"use client";

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
  { label: "Manhã", hours: "08 – 12h" },
  { label: "Tarde", hours: "13 – 17h" },
  { label: "Noite", hours: "19 – 23h" },
  { label: "Madrugada", hours: "01 – 05h" },
];

// availability[dayIndex][periodIndex] = true/false
export type Availability = boolean[][];

export function createEmptyAvailability(): Availability {
  return Array.from({ length: DAYS.length }, () =>
    Array(PERIODS.length).fill(false)
  );
}

export function availabilityToFlat(grid: Availability): boolean[] {
  return grid.flat();
}

export function flatToAvailability(flat: boolean[]): Availability {
  return Array.from({ length: DAYS.length }, (_, d) =>
    Array.from({ length: PERIODS.length }, (_, p) => flat[d * PERIODS.length + p] ?? false)
  );
}

interface Props {
  value: Availability;
  onChange?: (next: Availability) => void;
  readonly?: boolean;
}

export default function AvailabilityGrid({ value, onChange, readonly = false }: Props) {
  const toggle = (d: number, p: number) => {
    if (readonly || !onChange) return;
    const next = value.map((row, di) =>
      row.map((cell, pi) => (di === d && pi === p ? !cell : cell))
    );
    onChange(next);
  };

  return (
    <div className="w-full">
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
                const active = value[d]?.[p] ?? false;
                return (
                  <td key={d} className="py-2 px-1 text-center align-middle">
                    <button
                      type="button"
                      aria-label={`${DAYS[d]} ${period.label} ${active ? "disponível" : "indisponível"}`}
                      onClick={() => toggle(d, p)}
                      disabled={readonly}
                      className={[
                        "mx-auto flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-all duration-150 sm:h-10 sm:w-10 sm:text-base md:h-12 md:w-12 md:text-lg",
                        readonly ? "cursor-default" : "cursor-pointer",
                        active
                          ? "border-red-600 bg-red-600/30 shadow-[0_0_8px_rgba(220,38,38,0.5)]"
                          : "border-red-900/40 bg-[#1c1c1c] hover:border-red-700 hover:bg-red-900/10",
                      ].join(" ")}
                    >
                      <span aria-hidden="true" className={active ? "opacity-100" : "opacity-0"}>
                        ✅
                      </span>
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
          Clique nos quadrados para marcar / desmarcar sua disponibilidade.
        </p>
      )}
    </div>
  );
}
