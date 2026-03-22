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
  getDoc,
  setDoc
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
  const [editingId, setEditingId] = useState<string | null>(null);

  const router = useRouter();

  // -----------------------
  // 🔥 FUNÇÕES YOUTUBE
  // -----------------------

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

  function getYoutubeEmbed(url: string) {
    const id = getYoutubeId(url);
    if (!id) return url;
    return `https://www.youtube.com/embed/${id}`;
  }

  function getYoutubeThumbnail(url: string) {
    const id = getYoutubeId(url);
    if (!id) return null;
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  // -----------------------
  // Permissão
  // -----------------------

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (user) => {

      try {

        if (!user) {
          router.push("/");
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          router.push("/");
          return;
        }

        const data = snap.data();

        if (!canCreateNews(data.role)) {
          router.push("/");
          return;
        }

        await fetchNews();
        setLoading(false);

      } catch (error) {

        console.error("ERRO PERMISSÃO NOTÍCIAS:", error);
        router.push("/");

      }

    });

    return () => unsub();

  }, [router]);

  // -----------------------
  // Buscar notícias
  // -----------------------

  const fetchNews = async () => {

    try {

      const q = query(
        collection(db, "news"),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);

      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setNews(list);

    } catch (error) {

      console.error("Erro ao buscar notícias:", error);

    }

  };

  // -----------------------
  // Criar notícia
  // -----------------------

  const createNews = async () => {

    try {

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

      resetForm();
      await fetchNews();

      alert("Notícia publicada!");

    } catch (error) {

      console.error("Erro ao criar notícia:", error);
      alert("Erro ao publicar.");

    }

  };

  // -----------------------
  // Atualizar notícia
  // -----------------------

  const updateNews = async () => {

    try {

      if (!editingId) return;

      await setDoc(doc(db, "news", editingId), {
        title,
        content,
        image,
        video,
        updatedAt: new Date()
      }, { merge: true });

      resetForm();
      await fetchNews();

      alert("Notícia atualizada!");

    } catch (error) {

      console.error("Erro ao atualizar notícia:", error);
      alert("Erro ao atualizar.");

    }

  };

  // -----------------------
  // Excluir
  // -----------------------

  const deleteNews = async (id: string) => {

    if (!confirm("Excluir essa notícia?")) return;

    await deleteDoc(doc(db, "news", id));
    await fetchNews();

  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setImage("");
    setVideo("");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Carregando...</div>;
  }

  return (

    <div className="min-h-screen bg-[#0b0b0b] text-white p-12 flex justify-center">

      <div className="max-w-5xl w-full">

        <h1 className="text-4xl font-bold text-red-500 mb-10">
          Gerenciar Notícias
        </h1>

        {/* FORM */}

        <div className="flex flex-col gap-4 bg-[#111] p-6 border border-red-800 rounded-xl mb-12">

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
            onClick={editingId ? updateNews : createNews}
            className={`p-3 rounded ${
              editingId ? "bg-yellow-600" : "bg-red-700"
            }`}
          >
            {editingId ? "Salvar Edição" : "Publicar Notícia"}
          </button>

        </div>

        {/* LISTA */}

        <div className="space-y-6">

          {news.map((n) => {

            const thumb = getYoutubeThumbnail(n.video);

            return (

              <div key={n.id} className="bg-[#111] border border-red-800 p-6 rounded-xl">

                <h3 className="text-xl font-bold mb-2">{n.title}</h3>

                <p className="text-gray-400 mb-4">
                  {n.content.slice(0, 150)}...
                </p>

                {n.image && (
                  <img src={n.image} className="rounded mb-4 max-h-60 object-cover" />
                )}

                {/* 🔥 PLAYER INTELIGENTE */}

                {n.video && thumb && (
                  <div className="mb-4">

                    {/* Thumbnail */}
                    <div
                      className="relative cursor-pointer"
                      onClick={() => window.open(n.video, "_blank")}
                    >
                      <img src={thumb} className="rounded w-full" />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-red-600 p-4 rounded-full">
                          ▶
                        </div>
                      </div>
                    </div>

                    <a
                      href={n.video}
                      target="_blank"
                      className="block mt-2 text-red-400 underline"
                    >
                      Assistir no YouTube
                    </a>

                  </div>
                )}

                {/* BOTÕES */}

                <div className="flex gap-2">

                  <button
                    onClick={() => {
                      setEditingId(n.id);
                      setTitle(n.title);
                      setContent(n.content);
                      setImage(n.image || "");
                      setVideo(n.video || "");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="bg-yellow-600 px-4 py-2 rounded"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => deleteNews(n.id)}
                    className="bg-red-700 px-4 py-2 rounded"
                  >
                    Excluir
                  </button>

                </div>

              </div>

            );

          })}

        </div>

      </div>

    </div>

  );

}