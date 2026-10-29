"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getDemoUser, isAdminSession, isProfessorSession } from "@/lib/auth";
import { DEFAULT_AVATAR, resolveAvatarUrl } from "@/lib/profile-utils";
import { getSupabaseStatus, supabase } from "@/lib/supabase";

const getRoleName = (idRol: number | null | undefined) =>
  idRol === 1 ? "Superadministrador" : "Profesor";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@sistema.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (isAdminSession() || isProfessorSession()) {
      const currentRole = localStorage.getItem("session-role");
      if (currentRole === "Superadministrador") {
        router.push("/admin");
        return;
      }
      router.push("/dashboard");
      return;
    }

    const demoUser = getDemoUser(normalizedEmail, password);
    if (demoUser) {
      const nombreCompleto = `${demoUser.nombre ?? ""} ${demoUser.apellido ?? ""}`.trim();
      localStorage.setItem("session-role", demoUser.role);
      localStorage.setItem("session-email", normalizedEmail);
      localStorage.setItem("session-user-id", String(demoUser.id_usuario));
      localStorage.setItem("session-name", nombreCompleto || "Profesor");
      localStorage.setItem("session-avatar", resolveAvatarUrl(DEFAULT_AVATAR));
      setError("");

      if (demoUser.role === "Superadministrador") {
        router.push("/admin");
        return;
      }

      router.push("/dashboard");
      return;
    }

    if (!supabase) {
      setError("Credenciales inválidas. Verifica el correo y la contraseña.");
      return;
    }

    try {
      const { data, error: dbError } = await supabase
        .from("usuarios")
        .select("id_usuario, nombre, apellido, email, password, id_rol, avatar, cc")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (dbError) {
        throw dbError;
      }

      if (!data || data.password !== password) {
        setError("Credenciales inválidas. Verifica el correo y la contraseña.");
        return;
      }

      const role = getRoleName(data.id_rol);
      const nombreCompleto = `${data.nombre ?? ""} ${data.apellido ?? ""}`.trim();
      localStorage.setItem("session-role", role);
      localStorage.setItem("session-email", normalizedEmail);
      localStorage.setItem("session-user-id", String(data.id_usuario));
      localStorage.setItem("session-name", nombreCompleto || "Profesor");
      localStorage.setItem("session-avatar", resolveAvatarUrl(data.avatar ?? DEFAULT_AVATAR));
      setError("");

      if (role === "Superadministrador") {
        router.push("/admin");
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Error al autenticar con Supabase:", error);
      setError("No se pudo iniciar sesión con la base de datos en este momento.");
    }
  };

  return (
    <main className="auth-shell login-shell">
      <div className="login-layout">
        <aside className="login-visual" aria-label="Portada institucional">
          <div className="login-visual-inner">
            <div className="login-brand-mark" aria-hidden="true">
              ✦
            </div>

            <h1>
              Hola
            </h1>

            <p>
              Ingresa como profesor o administrador.
            </p>
          </div>

          <div className="login-credits">© 2026 Reservas. Todos los derechos reservados.</div>
        </aside>

        <section className="login-panel">
          <div className="login-card">
            <div className="login-header">
              <h2>Iniciar sesión</h2>
            </div>

            <form className="auth-form login-form" onSubmit={handleSubmit}>
              <label>
                Correo institucional
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@sistema.com"
                />
              </label>

              <label>
                Contraseña
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "◉" : "◌"}
                  </button>
                </div>
              </label>

              {error ? <p className="form-error">{error}</p> : null}

              <button type="submit" className="primary-login-button">
                Entrar
              </button>

              <div className="auth-links">
                <Link
                  href="#"
                  className="text-link"
                  onClick={(event) => {
                    event.preventDefault();
                    setError("Recuperación de contraseña no habilitada en este momento. Habla con el administrador.");
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
                <Link href="/registro" className="text-link">
                  ¿No tienes una cuenta? Regístrate
                </Link>
              </div>

              <Link href="/" className="text-link back-link">
                Volver al inicio
              </Link>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
