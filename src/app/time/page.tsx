"use client";

import { useRouter } from "next/navigation";

export default function TimePage() {
  const router = useRouter();

  const jogos = [
    {
      nome: "World of Warcraft TBC Classic",
      imagem: "/wow.jpg",
      rota: "/time/wowtbc",
    },
    // Descomente quando quiser reativar a pagina de LoL no seletor de time.
    // {
    //   nome: "League of Legends",
    //   imagem: "/capalol.jpg",
    //   rota: "/time/lol",
    // },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white py-20 px-6">

      {/* Título */}
      <h1 className="text-5xl font-bold text-center text-red-500 mb-16 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
        Selecionar Jogo
      </h1>

      {/* Grid de jogos */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">

        {jogos.map((jogo, index) => (
          <div
            key={index}
            onClick={() => router.push(jogo.rota)}
            className="relative h-[300px] rounded-2xl overflow-hidden cursor-pointer border border-red-900 shadow-[0_0_20px_rgba(255,0,0,0.2)] group"
          >
            {/* Background */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: `url(${jogo.imagem})` }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/70 group-hover:bg-black/50 transition" />

            {/* Texto */}
            <div className="relative z-10 flex items-center justify-center h-full text-center px-6">
              <h2 className="text-3xl font-bold text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
                {jogo.nome}
              </h2>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
