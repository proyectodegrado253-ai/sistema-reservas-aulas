"use client";

import ActionMenu from "@/components/action-menu";
import RoleSidebar from "@/components/role-sidebar";
import { isAdminSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type UsuarioRecord = {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  id_rol: number;
  estado: string;
  roles?: { nombre_rol?: string } | null;
};

type FormState = {
  id_usuario: number | null;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  id_rol: string;
  estado: string;
};

const emptyForm: FormState = {
  id_usuario: null,
  nombre: "",
  apellido: "",
  email: "",
  password: "",
  id_rol: "2",
  estado: "Activo",
};

const fallbackUsuarios: UsuarioRecord[] = [
  { id_usuario: 1, nombre: "Admin", apellido: "Sistema", email: "admin@sistema.com", password: "admin123", id_rol: 1, estado: "Activo", roles: { nombre_rol: "Superadministrador" } },
  { id_usuario: 2, nombre: "Profesor", apellido: "Asignado", email: "profesor@sistema.com", password: "profesor123", id_rol: 2, estado: "Activo", roles: { nombre_rol: "Profesor" } },
];

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioRecord[]>([]);
  const [roles, setRoles] = useState<Array<{ id_rol: number; nombre_rol: string }>>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const normalizeText = (value: string | null | undefined) =>
    (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const loadData = async () => {
    const savedUsuarios = JSON.parse(localStorage.getItem("cache-usuarios") ?? "null") as UsuarioRecord[] | null;
    const savedRoles = JSON.parse(localStorage.getItem("cache-roles") ?? "null") as Array<{ id_rol: number; nombre_rol: string }> | null;

    if (!supabase) {
      setRoles([]);
      setUsuarios([]);
      setMessage("Supabase no está configurado. No se pueden cargar usuarios reales sin NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    try {
      const [rolesResult, usuariosResult] = await Promise.all([
        supabase.from("roles").select("*").order("id_rol", { ascending: true }),
        supabase.from("usuarios").select("*, roles(nombre_rol)").order("apellido", { ascending: true }),
      ]);

      if (rolesResult.error || usuariosResult.error) {
        throw rolesResult.error ?? usuariosResult.error ?? new Error("Sin datos disponibles");
      }

      const nextRoles = (rolesResult.data as Array<{ id_rol: number; nombre_rol: string }> | null)?.length
        ? (rolesResult.data as Array<{ id_rol: number; nombre_rol: string }>)
        : [];
      const nextUsuarios = (usuariosResult.data as UsuarioRecord[] | null)?.length ? (usuariosResult.data as UsuarioRecord[]) : [];

      localStorage.setItem("cache-roles", JSON.stringify(nextRoles));
      localStorage.setItem("cache-usuarios", JSON.stringify(nextUsuarios));
      setRoles(nextRoles);
      setUsuarios(nextUsuarios);
    } catch (error) {
      setRoles([]);
      setUsuarios([]);
      setMessage("No se pudo cargar la información de usuarios desde Supabase. Revisa la conexión y la base de datos.");
      console.warn("Fallo en Supabase para usuarios.", error);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("session-role");

    if (!isAdminSession()) {
      if (role === "Profesor") {
        router.replace("/dashboard");
        return;
      }

      router.replace("/login");
      return;
    }

    loadData();
  }, [router]);

  const filtered = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return usuarios;

    return usuarios.filter((usuario) => {
      const haystack = [
        usuario.nombre,
        usuario.apellido,
        usuario.email,
        usuario.roles?.nombre_rol,
      ].join(" ");
      return normalizeText(haystack).includes(query);
    });
  }, [usuarios, search]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password || "123456",
      id_rol: Number(form.id_rol),
      estado: form.estado,
    };

    try {
      if (!supabase) {
        const current = JSON.parse(localStorage.getItem("cache-usuarios") ?? "[]") as UsuarioRecord[];
        const updated = form.id_usuario
          ? current.map((item) => (item.id_usuario === form.id_usuario ? { ...item, ...payload, id_usuario: item.id_usuario, roles: { nombre_rol: Number(form.id_rol) === 1 ? "Superadministrador" : "Profesor" } } : item))
          : [{ ...payload, id_usuario: Date.now(), roles: { nombre_rol: Number(form.id_rol) === 1 ? "Superadministrador" : "Profesor" } }, ...current];
        localStorage.setItem("cache-usuarios", JSON.stringify(updated));
        setUsuarios(updated);
      } else {
        if (form.id_usuario) {
          const { error } = await supabase.from("usuarios").update(payload).eq("id_usuario", form.id_usuario);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("usuarios").insert(payload);
          if (error) throw error;
        }
        await loadData();
      }

      setMessage(form.id_usuario ? "Usuario actualizado correctamente." : "Usuario registrado correctamente.");
      setForm(emptyForm);
    } catch (error) {
      setMessage("No se pudo guardar el usuario.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (usuario: UsuarioRecord) => {
    setForm({
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      password: usuario.password,
      id_rol: String(usuario.id_rol),
      estado: usuario.estado,
    });
    setShowForm(true);
    setMessage("Editando usuario seleccionado.");
  };

  const handleDeleteUsuario = async (id_usuario: number) => {
    if (!id_usuario) return;
    const confirmed = window.confirm("¿Seguro que quieres eliminar este usuario?");
    if (!confirmed) return;

    try {
      if (!supabase) {
        const current = JSON.parse(localStorage.getItem("cache-usuarios") ?? "[]") as UsuarioRecord[];
        const updated = current.filter((item) => item.id_usuario !== id_usuario);
        localStorage.setItem("cache-usuarios", JSON.stringify(updated));
        setUsuarios(updated);
      } else {
        const { error } = await supabase.from("usuarios").delete().eq("id_usuario", id_usuario);
        if (error) throw error;
        await loadData();
      }
      setMessage("Usuario eliminado correctamente.");
    } catch (error) {
      setMessage("No se pudo eliminar el usuario.");
      console.error(error);
    }
  };

  return (
    <main className="page-shell">
      <RoleSidebar />

      <section className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Administración</p>
            <h1>Usuarios</h1>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setShowForm(true);
            }}
          >
            Nuevo usuario
          </button>
        </header>

        <div className="reservas-controls">
          <div className="search-box">
            <span>Buscar</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, apellido o correo" />
          </div>
        </div>

        <div className="booking-grid">
          {showForm ? (
            <form className="form-card" onSubmit={handleSubmit}>
              <h3>{form.id_usuario ? "Editar usuario" : "Registrar usuario"}</h3>

              <div className="form-grid">
                <label>
                  Nombre
                  <input value={form.nombre} onChange={(event) => handleChange("nombre", event.target.value)} />
                </label>

                <label>
                  Apellido
                  <input value={form.apellido} onChange={(event) => handleChange("apellido", event.target.value)} />
                </label>

                <label className="full-width">
                  Correo
                  <input type="email" value={form.email} onChange={(event) => handleChange("email", event.target.value)} />
                </label>

                <label>
                  Contraseña
                  <input type="password" value={form.password} onChange={(event) => handleChange("password", event.target.value)} />
                </label>

                <label>
                  Rol
                  <select value={form.id_rol} onChange={(event) => handleChange("id_rol", event.target.value)}>
                    {roles.map((rol) => (
                      <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre_rol}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Estado
                  <select value={form.estado} onChange={(event) => handleChange("estado", event.target.value)}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </label>
              </div>

              {message ? <p className="form-feedback">{message}</p> : null}

              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Guardando..." : form.id_usuario ? "Actualizar" : "Guardar"}
                </button>
                <button type="button" className="secondary-button" onClick={() => {
                  setForm(emptyForm);
                  setShowForm(false);
                }}>
                  Cerrar
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              <h3>Registrar usuario</h3>
              <p>Haz clic en “Nuevo usuario” para abrir el formulario y crear o editar un registro.</p>
              <button type="button" className="primary-button" onClick={() => {
                setForm(emptyForm);
                setShowForm(true);
              }}>
                Crear usuario
              </button>
            </div>
          )}

          <div className="table-card">
            <div className="table-header">
              <h3>Usuarios registrados</h3>
              <span>{filtered.length} registros</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((usuario) => (
                    <tr key={usuario.id_usuario}>
                      <td>{usuario.nombre} {usuario.apellido}</td>
                      <td>{usuario.email}</td>
                      <td>{usuario.roles?.nombre_rol ?? (usuario.id_rol === 1 ? "Superadministrador" : "Profesor")}</td>
                      <td><span className={`status ${usuario.estado === "Activo" ? "aprobada" : "pendiente"}`}>{usuario.estado}</span></td>
                      <td>
                        <ActionMenu
                          items={[
                            { label: "Editar", onClick: () => handleEdit(usuario) },
                            { label: "Eliminar", variant: "danger", onClick: () => handleDeleteUsuario(usuario.id_usuario) },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
