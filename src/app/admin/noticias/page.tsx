"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  getDoc
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { canCreateNews } from "@/lib/permissions";

export default function NoticiasAdmin() {

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");

  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // -----------------------
  // Verificar permissão
  // -----------------------

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (user) => {

      if (!user) {
        router.push("/");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        router.push("/");
        return;
      }

      const data = snap.data();

      if (!canCreateNews(data.role)) {
        router.push("/");
        return;
      }

      fetchNews();
      setLoading(false);

    });

    return () => unsub();

  }, []);

  // -----------------------
  // Buscar notícias
  // -----------------------

  const fetchNews = async () => {

    const q = query(
      collection(db, "news"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    const list = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setNews(list);

  };

  // -----------------------
  // Criar notícia
  // -----------------------

  const createNews = async () => {

    if (!title.trim() || !content.trim()) {
      alert("Preencha título e conteúdo.");
      return;
    }

    await addDoc(collection(db, "news"), {

      title,
      content,
      image,
      video,
      createdAt: new Date()

    });

    setTitle("");
    setContent("");
    setImage("");
    setVideo("");

    fetchNews();

    alert("Notícia publicada!");

  };

  // -----------------------
  // Excluir notícia
  // -----------------------

  const deleteNews = async (id: string) => {

    if (!confirm("Excluir essa notícia?")) return;

    await deleteDoc(doc(db, "news", id));

    fetchNews();

  };

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Carregando painel...
      </div>
    );

  }

  return (

    <div className="min-h-screen bg-[#0b0b0b] text-white p-12 flex justify-center">

      <div className="max-w-5xl w-full">

        <h1 className="text-4xl font-bold text-red-500 mb-10 drop-shadow-[0_0_10px_rgba(255,0,0,0.7)]">
          Gerenciar Notícias
        </h1>

        {/* FORM */}

        <div className="flex flex-col gap-4 bg-[#111] p-6 border border-red-800 rounded-xl mb-12 shadow-[0_0_20px_rgba(255,0,0,0.15)]">

          <input
            type="text"
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-[#1c1c1c] border border-red-800 p-3 rounded"
          />

          <textarea
            placeholder="Conteúdo"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-[#1c1c1c] border border-red-800 p-3 rounded h-40"
          />

          <input
            type="text"
            placeholder="URL da imagem (opcional)"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="bg-[#1c1c1c] border border-red-800 p-3 rounded"
          />

          <input
            type="text"
            placeholder="URL do vídeo YouTube (opcional)"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            className="bg-[#1c1c1c] border border-red-800 p-3 rounded"
          />

          <button
            onClick={createNews}
            className="bg-red-700 p-3 rounded hover:bg-red-800 transition shadow-[0_0_10px_rgba(255,0,0,0.5)]"
          >
            Publicar Notícia
          </button>

        </div>

        {/* LISTA DE NOTÍCIAS */}

        <h2 className="text-2xl mb-6 text-red-400">
          Notícias Publicadas
        </h2>

        <div className="space-y-6">

          {news.map((n) => (

            <div
              key={n.id}
              className="bg-[#111] border border-red-800 p-6 rounded-xl shadow-[0_0_15px_rgba(255,0,0,0.15)]"
            >

              <h3 className="text-xl font-bold mb-2">
                {n.title}
              </h3>

              <p className="text-gray-400 mb-4">
                {n.content.slice(0, 150)}...
              </p>

              {n.image && (

                <img
                  src={n.image}
                  className="rounded mb-4 max-h-60 object-cover"
                />

              )}

              {n.video && (

                <div className="mb-4">

                  <iframe
                    src={n.video.replace("watch?v=", "embed/")}
                    className="w-full h-64 rounded"
                    allowFullScreen
                  />

                </div>

              )}

              <button
                onClick={() => deleteNews(n.id)}
                className="bg-red-700 px-4 py-2 rounded hover:bg-red-800 transition"
              >
                Excluir
              </button>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}