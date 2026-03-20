"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function NewsPage() {

  const { id } = useParams();

  const [news, setNews] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);

  const getVideoEmbed = (url: string) => {
    const videoId = url.split("v=")[1];
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date.seconds ? date.seconds * 1000 : date);
    return d.toLocaleDateString("pt-BR");
  };

  const fetchNews = async () => {

    const ref = doc(db, "news", id as string);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setNews(snap.data());
    }

  };

  const fetchComments = async () => {

    const q = query(
      collection(db, "comments"),
      where("newsId", "==", id),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setComments(list);

  };

  const fetchUserData = () => {

    onAuthStateChanged(auth, async (user) => {

      if (!user) {
        setLoadingUser(false);
        return;
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {

        const data = snap.data();

        setRole(data.role);
        setUserName(data.username);

      }

      setLoadingUser(false);

    });

  };

  useEffect(() => {

    fetchNews();
    fetchComments();
    fetchUserData();

  }, []);

  const sendComment = async () => {

    if (!newComment.trim()) return;

    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, "comments"), {

      newsId: id,
      user: userName,
      content: newComment,
      createdAt: new Date(),

    });

    setNewComment("");
    fetchComments();

  };

  if (!news) {

    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Carregando notícia...
      </div>
    );

  }

  return (

    <div className="min-h-screen bg-[#0b0b0b] text-white px-6 py-16 flex justify-center">

      <div className="max-w-4xl w-full">

        {/* TÍTULO */}

        <h1 className="text-5xl font-bold text-red-500 mb-4">
          {news.title}
        </h1>

        {/* META */}

        <p className="text-gray-400 mb-10">
          Por {news.author || "Admin"} • {formatDate(news.createdAt)}
        </p>

        {/* IMAGEM */}

        {news.image && (

          <Image
            src={news.image}
            alt={news.title}
            width={1200}
            height={600}
            className="rounded-xl mb-10 object-cover"
          />

        )}

        {/* VÍDEO */}

        {news.video && (

          <div className="mb-12">

            <iframe
              src={getVideoEmbed(news.video)}
              className="w-full h-[450px] rounded-xl"
              allowFullScreen
            />

          </div>

        )}

        {/* CONTEÚDO */}

        <div className="text-gray-300 text-lg leading-relaxed whitespace-pre-line mb-16">
          {news.content}
        </div>

        {/* COMENTÁRIOS */}

        <div className="border-t border-red-800 pt-10">

          <h2 className="text-3xl font-bold text-red-500 mb-8">
            Comentários
          </h2>

          {/* INPUT COMENTÁRIO */}

          {!loadingUser && (role === "member" || role === "vip" || role === "admin") && (

            <div className="mb-10">

              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="w-full bg-[#111] border border-red-800 p-4 rounded resize-none mb-4"
              />

              <button
                onClick={sendComment}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded"
              >
                Comentar
              </button>

            </div>

          )}

          {!loadingUser && role === "recruit" && (

            <p className="text-gray-500 mb-10">
              Apenas membros podem comentar.
            </p>

          )}

          {/* LISTA DE COMENTÁRIOS */}

          <div className="space-y-4">

            {comments.map((comment) => (

              <div
                key={comment.id}
                className="bg-[#111] border border-red-800 p-4 rounded"
              >

                <Link
                  href={`/perfil/${comment.user}`}
                  className="text-red-400 font-semibold hover:text-red-300"
                >
                  {comment.user}
                </Link>

                <p className="text-gray-300 mt-2">
                  {comment.content}
                </p>

              </div>

            ))}

          </div>

        </div>

      </div>

    </div>

  );

}