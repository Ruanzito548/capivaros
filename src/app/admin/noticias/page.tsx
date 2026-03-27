"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { canCreateNews } from "@/lib/permissions";

interface NewsEntry {
  id: string;
  title: string;
  content: string;
  image?: string;
  video?: string;
}

export default function NoticiasAdmin() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [news, setNews] = useState<NewsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const router = useRouter();

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

  function getYoutubeThumbnail(url: string) {
    const id = getYoutubeId(url);
    if (!id) return null;
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  const fetchNews = useCallback(async () => {
    try {
      const newsQuery = query(
        collection(db, "news"),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(newsQuery);

      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<NewsEntry, "id">),
      }));

      setNews(list);
    } catch (error) {
      console.error("Erro ao buscar noticias:", error);
    }
  }, []);

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
        console.error("Erro permissao noticias:", error);
        router.push("/");
      }
    });

    return () => unsub();
  }, [fetchNews, router]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setImage("");
    setVideo("");
  };

  const createNews = async () => {
    try {
      if (!title.trim() || !content.trim()) {
        alert("Preencha titulo e conteudo.");
        return;
      }

      await addDoc(collection(db, "news"), {
        title,
        content,
        image,
        video,
        createdAt: new Date(),
      });

      resetForm();
      await fetchNews();
      alert("Noticia publicada!");
    } catch (error) {
      console.error("Erro ao criar noticia:", error);
      alert("Erro ao publicar.");
    }
  };

  const updateNews = async () => {
    try {
      if (!editingId) return;

      await setDoc(
        doc(db, "news", editingId),
        {
          title,
          content,
          image,
          video,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      resetForm();
      await fetchNews();
      alert("Noticia atualizada!");
    } catch (error) {
      console.error("Erro ao atualizar noticia:", error);
      alert("Erro ao atualizar.");
    }
  };

  const deleteNews = async (id: string) => {
    if (!confirm("Excluir essa noticia?")) return;

    await deleteDoc(doc(db, "news", id));
    await fetchNews();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white p-12 flex justify-center">
      <div className="max-w-5xl w-full">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 text-sm text-gray-400 transition hover:text-red-400"
        >
          Voltar para Admin
        </button>

        <h1 className="text-4xl font-bold text-red-500 mb-10">
          Gerenciar Noticias
        </h1>

        <div className="flex flex-col gap-4 bg-[#111] p-6 border border-red-800 rounded-xl mb-12">
          <input
            type="text"
            placeholder="Titulo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-[#1c1c1c] border border-red-800 p-3 rounded"
          />

          <textarea
            placeholder="Conteudo"
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
            placeholder="URL do video YouTube (opcional)"
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
            {editingId ? "Salvar Edicao" : "Publicar Noticia"}
          </button>
        </div>

        <div className="space-y-6">
          {news.map((item) => {
            const thumb = item.video ? getYoutubeThumbnail(item.video) : null;

            return (
              <div
                key={item.id}
                className="bg-[#111] border border-red-800 p-6 rounded-xl"
              >
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>

                <p className="text-gray-400 mb-4">
                  {item.content.slice(0, 150)}...
                </p>

                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="rounded mb-4 max-h-60 object-cover"
                  />
                )}

                {item.video && thumb && (
                  <div className="mb-4">
                    <div
                      className="relative cursor-pointer"
                      onClick={() => window.open(item.video, "_blank")}
                    >
                      <img
                        src={thumb}
                        alt={item.title}
                        className="rounded w-full"
                      />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-red-600 p-4 rounded-full">
                          Play
                        </div>
                      </div>
                    </div>

                    <a
                      href={item.video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-2 text-red-400 underline"
                    >
                      Assistir no YouTube
                    </a>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setTitle(item.title);
                      setContent(item.content);
                      setImage(item.image || "");
                      setVideo(item.video || "");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="bg-yellow-600 px-4 py-2 rounded"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => deleteNews(item.id)}
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
