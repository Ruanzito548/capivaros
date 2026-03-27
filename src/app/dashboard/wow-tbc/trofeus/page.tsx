"use client";

export default function TrofeusPage() {
  return (
    <div className="min-h-screen bg-transparent px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-red-900/40 bg-black/20 p-10 text-center shadow-[0_0_35px_rgba(255,0,0,0.08)] backdrop-blur-sm">
          <div className="mb-6 text-6xl text-red-500/70">
            Trofeus
          </div>

          <h1 className="text-5xl font-bold tracking-wide text-white/90">
            Em breve
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-300/80">
            Esta area vai reunir as conquistas e destaques dos membros da
            guilda, com um visual mais completo e organizado.
          </p>
        </div>
      </div>
    </div>
  );
}
