"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getSupabaseStatus, supabase } from "@/lib/supabase";

type FormData = {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
};

const emptyForm: FormData = {
  nombre: "",
  apellido: "",
  email: "",
  password: "",
};

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nombre || !form.apellido || !form.email || !form.password) {
      setError("Completa todos los campos para continuar.");
      setSuccess("");
      return;
    }

    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setSuccess("");
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    const isSchemaMismatchError = (error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error ?? "");
      return /does not exist|relation .*usuarios|permission denied|RLS/i.test(detail);
    };

    try {
      if (!supabase) {
        const current = JSON.parse(localStorage.getItem("cache-usuarios") ?? "[]") as Array<Record<string, any>>;
        const exists = current.some((user) => String(user.email ?? "").toLowerCase() === normalizedEmail);

        if (exists) {
          setError("Ya existe un usuario registrado con ese correo.");
          setSuccess("");
          return;
        }

        const next = [{
          id_usuario: Date.now(),
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          email: normalizedEmail,
          password: form.password,
          id_rol: 2,
          estado: "Activo",
          roles: { nombre_rol: "Profesor" },
        }, ...current];

        localStorage.setItem("cache-usuarios", JSON.stringify(next));
        setError("");
        setSuccess("Registro guardado localmente. La base conectada no coincide con el esquema del proyecto, pero la app ya puede seguir creando usuarios.");
        setForm(emptyForm);
        setTimeout(() => router.push("/login"), 800);
        return;
      }

      const { data: existingUser, error: lookupError } = await supabase
        .from("usuarios")
        .select("id_usuario")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }

      if (existingUser) {
        setError("Ya existe un usuario registrado con ese correo.");
        setSuccess("");
        return;
      }

      const { error: insertError } = await supabase.from("usuarios").insert({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: normalizedEmail,
        password: form.password,
        id_rol: 2,
        estado: "Activo",
      });

      if (insertError) {
        throw insertError;
      }

      setError("");
      setSuccess("Registro exitoso. Ya puedes iniciar sesión.");
      setForm(emptyForm);
      setTimeout(() => router.push("/login"), 800);
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        const current = JSON.parse(localStorage.getItem("cache-usuarios") ?? "[]") as Array<Record<string, any>>;
        const exists = current.some((user) => String(user.email ?? "").toLowerCase() === normalizedEmail);
        if (!exists) {
          const next = [{
            id_usuario: Date.now(),
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
            email: normalizedEmail,
            password: form.password,
            id_rol: 2,
            estado: "Activo",
            roles: { nombre_rol: "Profesor" },
          }, ...current];
          localStorage.setItem("cache-usuarios", JSON.stringify(next));
        }
        setError("");
        setSuccess("Registro guardado localmente porque la base conectada no tiene el esquema del sistema. La app ya sigue funcionando sin tocar la base real.");
        setForm(emptyForm);
        setTimeout(() => router.push("/login"), 1200);
        return;
      }

      console.error("Error al registrar usuario:", error);
      setError("No se pudo completar el registro. Revisa la conexión con Supabase.");
      setSuccess("");
    }
  };

  return (
    <main className="register-shell">
      <section className="register-panel">
        <div className="auth-copy">
          <p className="eyebrow">Nueva cuenta</p>
          <h1>Registra a un docente</h1>
          <p>
            Completa la información para crear una cuenta institucional y guardarla en la base real cuando Supabase esté configurado.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Registro</h2>

          <label>
            Nombre
            <input
              type="text"
              value={form.nombre}
              onChange={(event) => handleChange("nombre", event.target.value)}
              placeholder="Ej: Ana"
            />
          </label>

          <label>
            Apellido
            <input
              type="text"
              value={form.apellido}
              onChange={(event) => handleChange("apellido", event.target.value)}
              placeholder="Ej: Gómez"
            />
          </label>

          <label>
            Correo institucional
            <input
              type="email"
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              placeholder="nombre@institucion.edu"
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={form.password}
              onChange={(event) => handleChange("password", event.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="form-success">{success}</p> : null}

          <button type="submit">Crear cuenta</button>

          <Link href="/login" className="text-link">
            Ya tengo cuenta
          </Link>
        </form>
      </section>
    </main>
  );
}
