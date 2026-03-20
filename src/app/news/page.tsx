"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export default function NewsList() {

  const [news, setNews] = useState<any[]>([]);

  useEffect(() => {

    const fetchNews = async () => {

      const q = query(
        collection(db, "news"),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);

      setNews(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );

    };

    fetchNews();

  }, []);

  const destaque = news[0];
  const outras = news.slice(1);

  const getVideoThumbnail = (url: string) => {
    const id = url.split("v=")[1];
    return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  };

  return (

    <div className="min-h-screen bg-[#0b0b0b] text-white px-6 py-16 flex flex-col items-center">

      <h1 className="text-5xl font-bold text-red-500 mb-16 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
        Notícias da Guilda
      </h1>

      <div className="max-w-6xl w-full">

        {/* NOTÍCIA DESTAQUE */}

        {destaque && (

          <Link href={`/news/${destaque.id}`}>

            <div className="mb-16 rounded-xl overflow-hidden border border-red-800 hover:border-red-500 transition cursor-pointer shadow-[0_0_40px_rgba(255,0,0,0.15)]">

              {destaque.image && (
                <Image
                  src={destaque.image}
                  alt={destaque.title}
                  width={1200}
                  height={600}
                  className="w-full h-[450px] object-cover"
                />
              )}

              {destaque.video && (
                <img
                  src={getVideoThumbnail(destaque.video)}
                  className="w-full h-[450px] object-cover"
                />
              )}

              <div className="p-8 bg-[#111]">

                <h2 className="text-3xl font-bold mb-4">
                  {destaque.title}
                </h2>

                <p className="text-gray-400 text-lg">
                  {destaque.content.slice(0, 240)}...
                </p>

                <p className="mt-4 text-red-400 font-semibold">
                  Ler notícia completa →
                </p>

              </div>

            </div>

          </Link>

        )}

        {/* OUTRAS NOTÍCIAS */}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

          {outras.map((n) => (

            <Link key={n.id} href={`/news/${n.id}`}>

              <div className="bg-[#111] border border-red-800 rounded-xl overflow-hidden hover:border-red-500 transition cursor-pointer hover:shadow-[0_0_25px_rgba(255,0,0,0.3)]">

                {n.image && (
                  <Image
                    src={n.image}
                    alt={n.title}
                    width={600}
                    height={300}
                    className="w-full h-[200px] object-cover"
                  />
                )}

                {n.video && (
                  <img
                    src={getVideoThumbnail(n.video)}
                    className="w-full h-[200px] object-cover"
                  />
                )}

                <div className="p-6">

                  <h3 className="text-xl font-semibold mb-2">
                    {n.title}
                  </h3>

                  <p className="text-gray-400 text-sm">
                    {n.content.slice(0, 120)}...
                  </p>

                </div>

              </div>

            </Link>

          ))}

        </div>

      </div>

    </div>

  );

}