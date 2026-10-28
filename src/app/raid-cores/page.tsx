import Link from "next/link";
import { RAID_CORE_SIZES } from "@/lib/raid-cores";

export default function RaidCoresPage() {
  return (
    <div className="min-h-screen bg-transparent px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 text-center text-4xl font-bold text-red-500">
          Cores
        </h1>

        <div className="mx-auto grid max-w-md gap-5">
          {RAID_CORE_SIZES.map((size) => (
            <Link
              key={size}
              href={`/raid-cores/core-${size}`}
              className="rounded-md border border-red-900 bg-[#111] p-6 text-center shadow-[0_0_18px_rgba(255,0,0,0.16)]"
            >
              <h2 className="text-2xl font-semibold text-red-400">Cores {size}</h2>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}