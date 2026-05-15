"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import AvailabilityGrid, {
  Availability,
  createEmptyAvailability,
  flatToAvailability,
  availabilityToFlat,
} from "@/components/availability-grid";

export default function EditProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [coverURL, setCoverURL] = useState("");
  const [availability, setAvailability] = useState<Availability>(
    createEmptyAvailability
  );

  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", u.uid));
      const data = snap.data();

      if (!data) return;

      setUsername(data.username || "");
      setPhotoURL(data.photoURL || "");
      setCoverURL(data.coverURL || "");

      if (Array.isArray(data.availability) && data.availability.length === 28) {
        setAvailability(flatToAvailability(data.availability as boolean[]));
      }

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const uploadImage = async (
    file: File,
    folder: "profile-photos" | "cover-photos"
  ) => {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Usuario nao autenticado.");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("Escolha um arquivo de imagem valido.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileRef = ref(
      storage,
      `${folder}/${user.uid}-${Date.now()}.${extension}`
    );

    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploadingPhoto(true);
      const url = await uploadImage(file, "profile-photos");
      setPhotoURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao enviar a foto.";
      alert(message);
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleCoverUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploadingCover(true);
      const url = await uploadImage(file, "cover-photos");
      setCoverURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao enviar a capa.";
      alert(message);
    } finally {
      setUploadingCover(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    try {
      setSaving(true);

      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          photoURL,
          coverURL,
          availability: availabilityToFlat(availability),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Erro ao atualizar perfil.");
        return;
      }

      alert("Perfil atualizado com sucesso!");
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-red-500 flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white py-20 px-6">
      <h1 className="text-4xl font-bold text-center text-red-500 mb-12 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
        Editar Perfil
      </h1>

      <div className="max-w-2xl mx-auto bg-[#141414] border border-red-900 rounded-2xl p-10 shadow-[0_0_20px_rgba(255,0,0,0.2)]">
        <div className="mb-6">
          <label className="block mb-2 text-red-400 font-semibold">
            Nome de Usuario
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 bg-[#1c1c1c] border border-red-900 rounded-lg focus:outline-none focus:border-red-600"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-red-400 font-semibold">
            Foto de Perfil
          </label>
          {photoURL && (
            <div className="mb-4 flex items-center gap-4">
              <Image
                src={photoURL}
                alt="Preview da foto de perfil"
                width={96}
                height={96}
                className="h-24 w-24 rounded-full border border-red-800 object-cover"
              />

              <button
                type="button"
                onClick={() => setPhotoURL("")}
                className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-300 transition hover:border-red-600 hover:text-white"
              >
                Remover foto
              </button>
            </div>
          )}
          <label className="mb-3 flex cursor-pointer items-center justify-center rounded-lg border border-red-800 bg-[#1c1c1c] px-4 py-3 text-sm text-gray-300 transition hover:border-red-600 hover:text-white">
            {uploadingPhoto ? "Enviando foto..." : "Escolher foto de perfil"}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
          <p className="text-sm text-gray-500">
            A imagem enviada sera usada como sua foto de perfil.
          </p>
        </div>

        <div className="mb-8">
          <label className="block mb-2 text-red-400 font-semibold">
            Foto de Capa
          </label>
          {coverURL && (
            <div className="mb-4">
              <Image
                src={coverURL}
                alt="Preview da foto de capa"
                width={1200}
                height={256}
                className="mb-4 h-32 w-full rounded-xl border border-red-800 object-cover"
              />

              <button
                type="button"
                onClick={() => setCoverURL("")}
                className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-300 transition hover:border-red-600 hover:text-white"
              >
                Remover capa
              </button>
            </div>
          )}
          <label className="mb-3 flex cursor-pointer items-center justify-center rounded-lg border border-red-800 bg-[#1c1c1c] px-4 py-3 text-sm text-gray-300 transition hover:border-red-600 hover:text-white">
            {uploadingCover ? "Enviando capa..." : "Escolher foto de capa"}
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </label>
          <p className="text-sm text-gray-500">
            A capa aparece no topo do seu perfil dentro do site.
          </p>
        </div>

        <div className="mb-8">
          <label className="block mb-4 text-red-400 font-semibold">
            Disponibilidade para jogar
          </label>
          <AvailabilityGrid value={availability} onChange={setAvailability} />
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-400 hover:text-white transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={saving || uploadingPhoto || uploadingCover}
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg shadow-[0_0_10px_rgba(255,0,0,0.6)] transition"
          >
            {saving ? "Salvando..." : "Salvar Alteracoes"}
          </button>
        </div>
      </div>
    </div>
  );
}
