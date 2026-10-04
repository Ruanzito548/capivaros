const cores = ["Core Hardcore", "Core 1", "Core 2", "Core 3"];

export default function CoresPage() {
  return (
    <div className="min-h-screen bg-transparent px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 text-center text-4xl font-bold text-red-500">
          Cores
        </h1>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cores.map((core) => (
            <section
              key={core}
              className="rounded-md border border-red-900 bg-[#111] p-6 text-center shadow-[0_0_18px_rgba(255,0,0,0.16)]"
            >
              <h2 className="text-2xl font-semibold text-red-400">{core}</h2>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}