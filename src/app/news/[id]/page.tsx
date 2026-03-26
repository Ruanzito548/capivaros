"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface NewsItem {
  title: string;
  author?: string;
  content: string;
  image?: string;
  video?: string;
  createdAt?: { seconds?: number } | number | null;
}

interface CommentItem {
  id: string;
  user: string;
  userId?: string;
  content: string;
}

export default function NewsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [news, setNews] = useState<NewsItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [playVideo, setPlayVideo] = useState(false);

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
    const youtubeId = getYoutubeId(url);
    if (!youtubeId) return null;
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  function getYoutubeEmbed(url: string) {
    const youtubeId = getYoutubeId(url);
    if (!youtubeId) return url;
    return `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
  }

  const formatDate = (date: NewsItem["createdAt"]) => {
    if (!date) return "";
    const timestamp =
      typeof date === "number" ? date : (date.seconds ?? 0) * 1000;
    return new Date(timestamp).toLocaleDateString("pt-BR");
  };

  const fetchNews = useCallback(async () => {
    const ref = doc(db, "news", id as string);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setNews(snap.data() as NewsItem);
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    const commentsQuery = query(
      collection(db, "comments"),
      where("newsId", "==", id),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(commentsQuery);

    const list = snapshot.docs.map((commentDoc) => {
      const data = commentDoc.data();

      return {
        id: commentDoc.id,
        user: data.user as string,
        userId: data.userId as string | undefined,
        content: data.content as string,
      };
    });

    setComments(list);
  }, [id]);

  useEffect(() => {
    const loadPage = async () => {
      await Promise.all([fetchNews(), fetchComments()]);
    };

    void loadPage();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUserId(user?.uid ?? null);

      if (!user) {
        setRole(null);
        setUserName("");
        setLoadingUser(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setRole((data.role as string | null) ?? null);
        setUserName((data.username as string) ?? "");
      }

      setLoadingUser(false);
    });

    return () => unsubscribe();
  }, [fetchComments, fetchNews]);

  const redirectToLogin = () => {
    router.push(`/login?next=/news/${id}`);
  };

  const sendComment = async () => {
    const user = auth.currentUser;

    if (!user) {
      redirectToLogin();
      return;
    }

    if (!newComment.trim()) return;

    await addDoc(collection(db, "comments"), {
      newsId: id,
      user: userName,
      userId: user.uid,
      content: newComment.trim(),
      createdAt: new Date(),
    });

    setNewComment("");
    fetchComments();
  };

  const canDeleteComment = (comment: CommentItem) => {
    if (role === "admin") return true;
    if (!currentUserId) return false;

    if (comment.userId) {
      return comment.userId === currentUserId;
    }

    return comment.user === userName;
  };

  const deleteComment = async (commentId: string) => {
    await deleteDoc(doc(db, "comments", commentId));
    fetchComments();
  };

  if (!news) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Carregando notÃ­cia...
      </div>
    );
  }

  const thumb = news.video ? getYoutubeThumbnail(news.video) : null;

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white px-6 py-16 flex justify-center">
      <div className="max-w-4xl w-full">
        <h1 className="text-5xl font-bold text-red-500 mb-4">
          {news.title}
        </h1>

        <p className="text-gray-400 mb-10">
          Por {news.author || "Admin"} • {formatDate(news.createdAt)}
        </p>

        {news.image && (
          <Image
            src={news.image}
            alt={news.title}
            width={1200}
            height={600}
            className="rounded-xl mb-10 object-cover"
          />
        )}

        {news.video && thumb && (
          <div className="mb-12">
            {!playVideo ? (
              <div
                className="relative cursor-pointer"
                onClick={() => setPlayVideo(true)}
              >
                <img
                  src={thumb}
                  alt={news.title}
                  className="rounded-xl w-full"
                />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-600 p-5 rounded-full text-2xl">
                    ▶
                  </div>
                </div>
              </div>
            ) : (
              <iframe
                src={getYoutubeEmbed(news.video)}
                className="w-full h-[450px] rounded-xl"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            )}

            <a
              href={news.video}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-red-400 underline"
            >
              Assistir no YouTube
            </a>
          </div>
        )}

        <div className="text-gray-300 text-lg leading-relaxed whitespace-pre-line mb-16">
          {news.content}
        </div>

        <div className="border-t border-red-800 pt-10">
          <h2 className="text-3xl font-bold text-red-500 mb-8">
            Comentários
          </h2>

          {!loadingUser && (
            <div className="mb-10">
              <textarea
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder={
                  currentUserId
                    ? "Escreva um comentário..."
                    : "Faça login para comentar"
                }
                disabled={!currentUserId}
                className="w-full bg-[#111] border border-red-800 p-4 rounded resize-none mb-4 disabled:opacity-60"
              />

              {!currentUserId && (
                <p className="text-gray-500 mb-4">
                  Você precisa estar logado para comentar.
                </p>
              )}

              <button
                onClick={sendComment}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded"
              >
                Comentar
              </button>
            </div>
          )}

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

                {canDeleteComment(comment) && (
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="mt-4 text-sm text-red-400 hover:text-red-300"
                  >
                    Excluir comentário
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
