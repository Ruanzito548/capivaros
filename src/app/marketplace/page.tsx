"use client";

import { useState } from "react";

export default function Marketplace() {
  const [products] = useState([
    {
      id: 1,
      title: "Mentoria PvP",
      description: "Treinamento estratégico personalizado.",
      price: "R$ 1,22",
      priceId: "price_1T4qw06BNq3beDEYHolNspQz",
    },
    {
      id: 2,
      title: "Mentoria PvE",
      description: "Otimização de performance em raids.",
      price: "R$ 147",
      priceId: "price_XXXXXXXX2",
    },
    {
      id: 3,
      title: "Apoio à Guilda",
      description: "Contribuição simbólica para manutenção do time.",
      price: "R$ 100",
      priceId: "price_1T4r8N6BNq3beDEYhHVapUH3",
    },
  ]);

  const handleCheckout = async (priceId: string) => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ priceId }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-transparent text-white py-16 px-6">
      <h1 className="text-5xl font-bold text-center text-red-500 mb-14 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
        Marketplace dos Capivaros
      </h1>

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-[#141414] border border-red-900 rounded-2xl p-8 shadow-[0_0_20px_rgba(255,0,0,0.2)] flex flex-col justify-between"
          >
            <div>
              <h2 className="text-2xl font-bold text-red-400 mb-4">
                {product.title}
              </h2>

              <p className="text-gray-400 mb-6">
                {product.description}
              </p>
            </div>

            <div>
              <p className="text-2xl font-bold text-white mb-4">
                {product.price}
              </p>

              <button
                onClick={() => handleCheckout(product.priceId)}
                className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg transition shadow-[0_0_10px_rgba(255,0,0,0.6)]"
              >
                Comprar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
