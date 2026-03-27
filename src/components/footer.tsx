export default function Footer() {
  return (
    <footer className="bg-[#0b0b0b] border-t border-red-800 shadow-[0_-4px_25px_rgba(255,0,0,0.15)] text-gray-400 py-20 px-6">

      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 items-center">

        {/* ESQUERDA */}
        <div className="text-sm leading-relaxed">
          <h3 className="text-red-500 font-bold text-lg mb-3 drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]">
            CAPIVAROS
          </h3>
          <p>
            Fundado por mentes com hiperfoco em jogos,
            para mentes com hiperfoco em jogos.
          </p>
        </div>

        {/* CENTRO - ÍCONES */}
        <div className="flex justify-center items-center gap-8">

          <a
            href="https://discord.gg/ADhrNMzmTn"
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 flex items-center justify-center bg-[#141414] border border-red-900 rounded-full hover:bg-red-600 hover:scale-110 transition duration-300 shadow-[0_0_12px_rgba(255,0,0,0.3)]"
          >
            <img src="/discord.svg" alt="Discord" className="w-7 h-7" />
          </a>

        </div>

        {/* DIREITA */}
        <div className="text-sm text-right leading-relaxed">
          <p className="text-red-400 font-semibold">
            União. Disciplina. Domínio.
          </p>
          <p className="mt-2 text-gray-500">
            Um time focado em comunidade,
            resultado e evolução constante.
          </p>
        </div>

      </div>

      {/* Linha inferior */}
      <div className="mt-16 text-center text-xs text-gray-600 border-t border-red-900 pt-6">
        © {new Date().getFullYear()} Capivaros Templários Team.
        <span className="text-red-600"> Todos os direitos reservados.</span>
      </div>

    </footer>
  );
}
