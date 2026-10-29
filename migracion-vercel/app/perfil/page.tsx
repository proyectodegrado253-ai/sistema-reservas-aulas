"use client";

import RoleSidebar from "@/components/role-sidebar";
import { supabase } from "@/lib/supabase";
import { buildFullName, DEFAULT_AVATAR, resolveAvatarUrl } from "@/lib/profile-utils";
import { useEffect, useMemo, useRef, useState } from "react";

type UserProfile = {
  id_usuario: number | null;
  nombre: string;
  apellido: string;
  email: string;
  avatar: string;
  cc: string;
};

const getStoredUsers = () => {
  if (typeof window === "undefined") return [] as Array<Record<string, any>>;

  try {
    return JSON.parse(window.localStorage.getItem("cache-usuarios") ?? "[]") as Array<Record<string, any>>;
  } catch {
    return [] as Array<Record<string, any>>;
  }
};

const splitFullName = (fullName: string) => {
  const value = fullName.trim();
  if (!value) {
    return { nombre: "Profesor", apellido: "Usuario" };
  }

  const parts = value.split(/\s+/);
  const nombre = parts[0] ?? "Profesor";
  const apellido = parts.slice(1).join(" ") || "Usuario";
  return { nombre, apellido };
};

export default function PerfilPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [role, setRole] = useState("Profesor");
  const [email, setEmail] = useState("profesor@sistema.com");
  const [nombre, setNombre] = useState("Profesor Asignado");
  const [telefono, setTelefono] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(DEFAULT_AVATAR);
  const [guardado, setGuardado] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const completion = useMemo(() => {
    let score = 0;
    if (nombre.trim()) score += 35;
    if (telefono.trim()) score += 30;
    if (email.trim()) score += 20;
    if (avatarPreview && avatarPreview !== DEFAULT_AVATAR) score += 15;
    return Math.min(score, 100);
  }, [avatarPreview, email, nombre, telefono]);

  useEffect(() => {
    const storedRole = localStorage.getItem("session-role") ?? "Profesor";
    const storedEmail = localStorage.getItem("session-email") ?? "profesor@sistema.com";
    const storedUserId = Number(localStorage.getItem("session-user-id") ?? 0) || null;
    const storedName = localStorage.getItem("session-name") ?? "Profesor Asignado";
    const storedAvatar = localStorage.getItem("session-avatar") ?? "";
    const storedUsers = getStoredUsers();

    setRole(storedRole);
    setEmail(storedEmail);
    setNombre(storedName || storedEmail.split("@")[0] || "Profesor Asignado");
    setUserId(storedUserId);

    const matchedUser = storedUsers.find((user) => Number(user.id_usuario) === Number(storedUserId));
    const candidateName = matchedUser ? buildFullName(matchedUser) : storedName || "Profesor Asignado";
    const candidateAvatar = storedAvatar || matchedUser?.avatar || DEFAULT_AVATAR;

    setNombre(candidateName);
    setTelefono((matchedUser?.cc ?? matchedUser?.telefono ?? "").toString());
    setAvatarPreview(resolveAvatarUrl(candidateAvatar));
  }, []);

  const persistSessionData = (nextName: string, nextAvatar: string) => {
    localStorage.setItem("session-name", nextName || "Profesor");
    localStorage.setItem("session-avatar", nextAvatar || DEFAULT_AVATAR);
    window.dispatchEvent(new Event("session-updated"));
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isValidType = ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
    if (!isValidType) {
      setError("El archivo debe ser una imagen JPG o PNG.");
      return;
    }

    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError("La imagen debe pesar menos de 2 MB.");
      return;
    }

    try {
      let previewUrl = URL.createObjectURL(file);

      if (supabase && userId) {
        const safeFileName = `${userId}-${Date.now()}.png`;
        const uploadPath = `avatars/${safeFileName}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(uploadPath, file, {
          cacheControl: "3600",
          upsert: true,
        });

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(uploadPath);
          previewUrl = publicData.publicUrl;
        }
      }

      setAvatarPreview(resolveAvatarUrl(previewUrl));
      localStorage.setItem("session-avatar", resolveAvatarUrl(previewUrl));
      window.dispatchEvent(new Event("session-updated"));
      setError("");
    } catch (uploadError) {
      console.error("No se pudo subir la imagen:", uploadError);
      setError("No se pudo guardar la imagen del perfil.");
    }

    event.target.value = "";
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setGuardado("");

    const nextName = nombre.trim();
    const { nombre: firstName, apellido: lastName } = splitFullName(nextName || "Profesor");
    const nextTelefono = telefono.trim();

    try {
      const savedUsers = getStoredUsers();
      const currentUser = savedUsers.find((user) => Number(user.id_usuario) === Number(userId));

      if (supabase && userId) {
        const { error: updateError } = await supabase
          .from("usuarios")
          .update({
            nombre: firstName,
            apellido: lastName,
            cc: nextTelefono || null,
            avatar: resolveAvatarUrl(avatarPreview),
          })
          .eq("id_usuario", userId);

        if (updateError) throw updateError;
      }

      const updatedUsers = savedUsers.map((user) => {
        if (Number(user.id_usuario) !== Number(userId)) return user;
        return {
          ...user,
          nombre: firstName,
          apellido: lastName,
          cc: nextTelefono || user.cc || null,
          avatar: resolveAvatarUrl(avatarPreview),
        };
      });

      if (!savedUsers.some((user) => Number(user.id_usuario) === Number(userId))) {
        updatedUsers.push({
          id_usuario: userId ?? Date.now(),
          nombre: firstName,
          apellido: lastName,
          email,
          cc: nextTelefono || null,
          avatar: resolveAvatarUrl(avatarPreview),
        });
      }

      localStorage.setItem("cache-usuarios", JSON.stringify(updatedUsers));
      persistSessionData(nextName || "Profesor", resolveAvatarUrl(avatarPreview));

      setGuardado("Perfil actualizado correctamente.");
    } catch (saveError) {
      console.error("Error al guardar el perfil:", saveError);
      setError("No se pudo guardar el perfil. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-shell">
      <RoleSidebar />

      <section className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Cuenta</p>
            <h1>Configuración de perfil</h1>
          </div>
          <div className="user-pill">
            <span>{role}</span>
            <small>{email}</small>
          </div>
        </header>

        <div className="dashboard-layout">
          <article className="info-card dashboard-section">
            <div className="section-header">
              <h3>Datos personales</h3>
              <span>Perfil</span>
            </div>

            <form className="form-card" onSubmit={handleSave}>
              <div className="profile-header-row">
                <div className="profile-avatar-box">
                  <img src={avatarPreview} alt="Avatar del perfil" className="profile-avatar" onError={(event) => { event.currentTarget.src = DEFAULT_AVATAR; }} />
                  <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
                    Cambiar foto
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" hidden onChange={handleAvatarChange} />
                </div>

                <div className="profile-completion">
                  <span>Completitud del perfil</span>
                  <strong>{completion}%</strong>
                  <div className="completion-bar">
                    <span style={{ width: `${completion}%` }} />
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  Nombre completo
                  <input value={nombre} onChange={(event) => setNombre(event.target.value)} />
                </label>

                <label>
                  Correo institucional
                  <input value={email} readOnly />
                </label>

                <label>
                  Teléfono
                  <input value={telefono} onChange={(event) => setTelefono(event.target.value)} placeholder="+56 9 1234 5678" />
                </label>

                <label>
                  Rol
                  <input value={role} readOnly />
                </label>
              </div>

              {error ? <p className="form-feedback error-message">{error}</p> : null}
              {guardado ? <p className="form-feedback">{guardado}</p> : null}

              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
                <button type="button" className="secondary-button" onClick={() => {
                  const storedName = localStorage.getItem("session-name") ?? "Profesor Asignado";
                  const storedAvatar = localStorage.getItem("session-avatar") ?? DEFAULT_AVATAR;
                  setNombre(storedName);
                  setAvatarPreview(resolveAvatarUrl(storedAvatar));
                }}>
                  Cancelar
                </button>
              </div>
            </form>
          </article>

          <article className="info-card dashboard-section activity-card">
            <div className="section-header">
              <h3>Seguridad</h3>
              <span>Cuenta</span>
            </div>
            <ul className="list">
              <li>Último inicio de sesión: hoy a las 08:20.</li>
              <li>Autenticación activa y protegida.</li>
              <li>Preferencias de acceso sincronizadas.</li>
              <li>Permisos actualizados según el rol asignado.</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
