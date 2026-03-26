export default function SucessoPage() {
  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center px-6">
      
      <h1 className="text-5xl font-bold text-green-500 mb-6 drop-shadow-[0_0_15px_rgba(0,255,0,0.7)]">
        ✅ Pagamento Aprovado!
      </h1>

      <p className="text-gray-300 text-lg mb-8 text-center max-w-xl">
        Seu pagamento foi processado com sucesso.
        Em breve você receberá a confirmação no e-mail informado.
      </p>

      <a
        href="/marketplace"
        className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg transition shadow-[0_0_10px_rgba(0,255,0,0.6)]"
      >
        Voltar ao Marketplace
      </a>

    </div>
  );
}
