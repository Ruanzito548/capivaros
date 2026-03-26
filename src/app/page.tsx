"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface News {
  id: string;
  title: string;
  content: string;
  image?: string;
  video?: string;
  createdAt?: number | null;
}

export default function Home() {

  const [news, setNews] = useState<News[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch("/api/news?limit=3");

        if (!response.ok) {
          throw new Error("Failed to load news");
        }

        const list = (await response.json()) as News[];
        setNews(list);
      } catch (error) {
        console.error("Erro ao buscar noticias publicas:", error);
        setNews([]);
      }
    };

    fetchNews();
  }, []);

  const destaque = news[0];
  const outras = news.slice(1);

  // 🔥 YOUTUBE HELPERS

  function getYoutubeId(url: string) {
    try {
      const parsed = new URL(url);

      if (parsed.hostname.includes("youtube.com")) {
        return parsed.searchParams.get("v");
      }

      if (parsed.hostname === "youtu.be") {
        return parsed.pathname.slice(1);
      }

      return null;
    } catch {
      return null;
    }
  }

  function getVideoThumbnail(url: string) {
    const id = getYoutubeId(url);
    if (!id) return null;
    return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  }

  return (

    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(120,0,0,0.28),transparent_45%),linear-gradient(180deg,#050505_0%,#0b0b0b_45%,#120000_100%)]">

      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 px-6 py-20 flex flex-col items-center min-h-screen text-white">

      {/* HERO */}

      <div className="text-center mb-20">

        <Image
          src="/capilogo.png"
          alt="Capivaros Logo"
          width={150}
          height={150}
          className="mx-auto mb-8"
        />

        <h1 className="text-6xl font-extrabold text-red-500 mb-6">
          Capivaros Templários
        </h1>

        <p className="text-gray-400 max-w-xl mx-auto text-lg mb-10">
          União. Disciplina. Domínio.
          <br />
          Uma guilda focada em estratégia e evolução constante.
        </p>

        <div className="flex gap-6 justify-center flex-wrap">

          <Link
            href="/dashboard"
            className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-lg font-semibold"
          >
            Acessar Dashboard
          </Link>

          <a
            href="https://discord.gg/mTGxfJv9TR"
            target="_blank"
            className="border border-red-700 hover:bg-red-900 px-8 py-3 rounded-lg"
          >
            Entrar no Discord
          </a>

        </div>

      </div>

      {/* NOTÍCIAS */}

      <div className="max-w-6xl w-full">

        <h2 className="text-3xl font-bold text-red-500 mb-10">
          Últimas Notícias
        </h2>

        {/* DESTAQUE */}

        {destaque && (

          <Link href={`/news/${destaque.id}`}>

            <div className="mb-12 rounded-xl overflow-hidden border border-red-800 hover:border-red-500 transition cursor-pointer">

              {destaque.image ? (
                <Image
                  src={destaque.image}
                  alt={destaque.title}
                  width={1200}
                  height={500}
                  className="w-full h-[420px] object-cover"
                />
              ) : destaque.video ? (
                (() => {
                  const thumb = getVideoThumbnail(destaque.video);
                  return thumb && (
                    <img
                      src={thumb}
                      alt={destaque.title}
                      className="w-full h-[420px] object-cover"
                    />
                  );
                })()
              ) : null}

              <div className="p-8 bg-[#111]">

                <h3 className="text-3xl font-bold mb-4">
                  {destaque.title}
                </h3>

                <p className="text-gray-400 text-lg">
                  {destaque.content.slice(0, 220)}...
                </p>

              </div>

            </div>

          </Link>

        )}

        {/* OUTRAS */}

        <div className="grid md:grid-cols-2 gap-8">

          {outras.map((n) => {

            const thumb = n.video ? getVideoThumbnail(n.video) : null;

            return (

              <Link key={n.id} href={`/news/${n.id}`}>

                <div className="bg-[#111] rounded-xl border border-red-800 overflow-hidden hover:border-red-500 transition cursor-pointer">

                  {n.image ? (
                    <Image
                      src={n.image}
                      alt={n.title}
                      width={600}
                      height={300}
                      className="w-full h-[200px] object-cover"
                    />
                  ) : thumb ? (
                    <img
                      src={thumb}
                      alt={n.title}
                      className="w-full h-[200px] object-cover"
                    />
                  ) : null}

                  <div className="p-6">

                    <h4 className="text-xl font-semibold mb-2">
                      {n.title}
                    </h4>

                    <p className="text-gray-400 text-sm">
                      {n.content.slice(0, 120)}...
                    </p>

                  </div>

                </div>

              </Link>

            );

          })}

        </div>

        {/* VER MAIS */}

        <div className="text-center mt-12">

          <Link
            href="/news"
            className="inline-block bg-red-600 hover:bg-red-700 px-8 py-3 rounded-lg font-semibold"
          >
            Ver Mais Notícias
          </Link>

        </div>

      </div>

      </div>

    </div>

  );

}
