"use client"

import { useEffect, useState } from "react"

type Trophy = {
  id: string
  name: string
  description: string
  rarity: "common" | "rare" | "epic" | "legendary"
  points: number
  unlocked: boolean
}

const rarityGlow = {
  common: "border-gray-600 hover:shadow-gray-500/30",
  rare: "border-blue-500 hover:shadow-blue-500/40",
  epic: "border-purple-500 hover:shadow-purple-500/40",
  legendary: "border-yellow-400 hover:shadow-yellow-400/50",
}

const rarityColor = {
  common: "text-gray-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-300",
}

export default function TrofeusPage() {
  const [trophies, setTrophies] = useState<Trophy[]>([])

  useEffect(() => {
    const data: Trophy[] = [
      {
        id: "1",
        name: "Primeiro Passo",
        description: "Entrou no site pela primeira vez",
        rarity: "common",
        points: 10,
        unlocked: true,
      },
      {
        id: "2",
        name: "Membro do Discord",
        description: "Conectou sua conta ao Discord",
        rarity: "rare",
        points: 50,
        unlocked: true,
      },
      {
        id: "3",
        name: "Top 10 da Temporada",
        description: "Alcançou o Top 10 do ranking",
        rarity: "epic",
        points: 150,
        unlocked: false,
      },
      {
        id: "4",
        name: "Campeão Supremo",
        description: "Ficou em 1º lugar na temporada",
        rarity: "legendary",
        points: 500,
        unlocked: false,
      },
    ]

    setTrophies(data)
  }, [])

  const unlocked = trophies.filter(t => t.unlocked).length
  const progress = (unlocked / trophies.length) * 100

  return (
    <div className="min-h-screen bg-transparent text-white p-10">

      {/* header */}
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-red-500 tracking-wide">
          🏆 Sala de Troféus
        </h1>

        <p className="text-gray-400 mt-2">
          Conquistas obtidas dentro da guild Capivaros Templários.
        </p>
      </div>

      {/* progresso */}
      <div className="mb-12">
        <div className="flex justify-between mb-2 text-sm text-gray-400">
          <span>Progresso de Conquistas</span>
          <span>{unlocked} / {trophies.length}</span>
        </div>

        <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

        {trophies.map((trophy) => (
          <div
            key={trophy.id}
            className={`relative p-6 rounded-xl border bg-gradient-to-b from-zinc-900 to-black transition-all duration-300 hover:scale-105 hover:shadow-xl ${
              rarityGlow[trophy.rarity]
            } ${!trophy.unlocked ? "opacity-40" : ""}`}
          >

            {/* brilho lendário */}
            {trophy.rarity === "legendary" && trophy.unlocked && (
              <div className="absolute inset-0 rounded-xl animate-pulse bg-yellow-400/10" />
            )}

            {/* ícone */}
            <div className="text-5xl text-center mb-4">
              🏆
            </div>

            {/* título */}
            <h2 className="text-lg font-bold text-center">
              {trophy.name}
            </h2>

            {/* descrição */}
            <p className="text-sm text-gray-400 text-center mt-2">
              {trophy.description}
            </p>

            {/* raridade */}
            <div className={`text-center mt-4 text-xs uppercase tracking-widest ${rarityColor[trophy.rarity]}`}>
              {trophy.rarity}
            </div>

            {/* pontos */}
            <div className="text-center mt-2 font-bold text-red-400">
              {trophy.points} pts
            </div>

            {!trophy.unlocked && (
              <div className="absolute top-3 right-3 text-lg">
                🔒
              </div>
            )}

          </div>
        ))}

      </div>

    </div>
  )
}
