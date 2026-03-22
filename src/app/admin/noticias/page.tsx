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

  // 🔥 NOVO: controle de edição
  const [editingId, setEditingId] = useState<string | null>(null);

  const router = useRouter();

  // -----------------------
  // Verificar permissão
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

      if (!title.trim() || !content.trim()) {
        alert("Preencha título e conteúdo.");
        return;
      }

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
  // Excluir notícia
  // -----------------------

  const deleteNews = async (id: string) => {

    try {

      if (!confirm("Excluir essa notícia?")) return;

      await deleteDoc(doc(db, "news", id));
      await fetchNews();

    } catch (error) {

      console.error("Erro ao excluir notícia:", error);
      alert("Erro ao excluir.");

    }

  };

  // -----------------------
  // Reset form
  // -----------------------

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setImage("");
    setVideo("");
  };

  // -----------------------
  // Loading
  // -----------------------

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
            className={`p-3 rounded transition ${
              editingId
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-red-700 hover:bg-red-800"
            }`}
          >
            {editingId ? "Salvar Edição" : "Publicar Notícia"}
          </button>

        </div>

        {/* LISTA */}

        <h2 className="text-2xl mb-6 text-red-400">
          Notícias Publicadas
        </h2>

        <div className="space-y-6">

          {news.map((n) => (

            <div
              key={n.id}
              className="bg-[#111] border border-red-800 p-6 rounded-xl"
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
                  className="bg-yellow-600 px-4 py-2 rounded hover:bg-yellow-700 transition"
                >
                  Editar
                </button>

                <button
                  onClick={() => deleteNews(n.id)}
                  className="bg-red-700 px-4 py-2 rounded hover:bg-red-800 transition"
                >
                  Excluir
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}