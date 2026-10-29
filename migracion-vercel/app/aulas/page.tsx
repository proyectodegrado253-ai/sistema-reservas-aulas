"use client";

import ActionMenu from "@/components/action-menu";
import RoleSidebar from "@/components/role-sidebar";
import { isAdminSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AulaRecord = {
  id_aula: number;
  codigo_aula: string;
  nombre_aula: string;
  capacidad: number;
  equipamiento: string | null;
  estado: string;
};

type FormState = {
  id_aula: number | null;
  codigo_aula: string;
  nombre_aula: string;
  capacidad: string;
  equipamiento: string;
  estado: string;
};

const emptyForm: FormState = {
  id_aula: null,
  codigo_aula: "",
  nombre_aula: "",
  capacidad: "",
  equipamiento: "",
  estado: "Activo",
};

const fallbackAulas: AulaRecord[] = [
  { id_aula: 1, codigo_aula: "A-101", nombre_aula: "Aula 101", capacidad: 35, equipamiento: "Proyector, Wi‑Fi", estado: "Activo" },
  { id_aula: 2, codigo_aula: "LAB-2", nombre_aula: "Laboratorio 2", capacidad: 25, equipamiento: "PC, Pizarra, Proyector", estado: "Activo" },
  { id_aula: 3, codigo_aula: "SAL-3", nombre_aula: "Salón de grados", capacidad: 80, equipamiento: "Sistema de audio", estado: "Mantenimiento" },
];

export default function AulasPage() {
  const router = useRouter();
  const [aulas, setAulas] = useState<AulaRecord[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const normalizeText = (value: string | null | undefined) =>
    (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const loadData = async () => {
    const savedAulas = JSON.parse(localStorage.getItem("cache-aulas") ?? "null") as AulaRecord[] | null;

    if (!supabase) {
      setMessage("Supabase no está configurado. Debes definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY antes de cargar aulas reales.");
      setAulas([]);
      return;
    }

    try {
      const { data, error } = await supabase.from("aulas").select("*").order("nombre_aula", { ascending: true });
      if (error) throw error;

      const nextAulas = (data as AulaRecord[] | null)?.length ? (data as AulaRecord[]) : [];
      localStorage.setItem("cache-aulas", JSON.stringify(nextAulas));
      setAulas(nextAulas);
      setMessage("");
    } catch (error) {
      setAulas([]);
      setMessage("No se pudo conectar con Supabase. Revisa la configuración de la base de datos.");
      console.warn("Fallo en Supabase para aulas.", error);
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
    if (!query) return aulas;

    return aulas.filter((aula) => {
      const haystack = [aula.codigo_aula, aula.nombre_aula, aula.equipamiento ?? "", aula.estado].join(" ");
      return normalizeText(haystack).includes(query);
    });
  }, [aulas, search]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      codigo_aula: form.codigo_aula.trim(),
      nombre_aula: form.nombre_aula.trim(),
      capacidad: Number(form.capacidad),
      equipamiento: form.equipamiento.trim() || null,
      estado: form.estado,
    };

    try {
      if (!supabase) {
        setMessage("No se pudo guardar la aula porque Supabase no está disponible.");
        return;
      }

      if (form.id_aula) {
        const { error } = await supabase.from("aulas").update(payload).eq("id_aula", form.id_aula);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("aulas").insert(payload);
        if (error) throw error;
      }

      await loadData();
      setMessage(form.id_aula ? "Aula actualizada correctamente." : "Aula registrada correctamente.");
      setForm(emptyForm);
    } catch (error) {
      setMessage("No se pudo guardar la aula.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (aula: AulaRecord) => {
    setForm({
      id_aula: aula.id_aula,
      codigo_aula: aula.codigo_aula,
      nombre_aula: aula.nombre_aula,
      capacidad: String(aula.capacidad),
      equipamiento: aula.equipamiento ?? "",
      estado: aula.estado,
    });
    setShowForm(true);
    setMessage("Editando aula seleccionada.");
  };

  return (
    <main className="page-shell">
      <RoleSidebar />

      <section className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Gestión</p>
            <h1>Aulas</h1>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setShowForm(true);
            }}
          >
            Nueva aula
          </button>
        </header>

        <div className="reservas-controls">
          <div className="search-box">
            <span>Buscar</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, nombre o equipo" />
          </div>
        </div>

        <div className="booking-grid">
          {showForm ? (
            <form className="form-card" onSubmit={handleSubmit}>
              <h3>{form.id_aula ? "Editar aula" : "Registrar aula"}</h3>

              <div className="form-grid">
                <label>
                  Código
                  <input value={form.codigo_aula} onChange={(event) => handleChange("codigo_aula", event.target.value)} placeholder="A-101" />
                </label>

                <label>
                  Nombre
                  <input value={form.nombre_aula} onChange={(event) => handleChange("nombre_aula", event.target.value)} placeholder="Aula 101" />
                </label>

                <label>
                  Capacidad
                  <input type="number" min="1" value={form.capacidad} onChange={(event) => handleChange("capacidad", event.target.value)} placeholder="35" />
                </label>

                <label>
                  Estado
                  <select value={form.estado} onChange={(event) => handleChange("estado", event.target.value)}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </select>
                </label>

                <label className="full-width">
                  Equipamiento
                  <input value={form.equipamiento} onChange={(event) => handleChange("equipamiento", event.target.value)} placeholder="Proyector, Wi‑Fi, pizarra" />
                </label>
              </div>

              {message ? <p className="form-feedback">{message}</p> : null}

              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Guardando..." : form.id_aula ? "Actualizar" : "Guardar"}
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
              <h3>Registrar aula</h3>
              <p>Haz clic en “Nueva aula” para abrir el formulario y crear o editar un registro.</p>
              <button type="button" className="primary-button" onClick={() => {
                setForm(emptyForm);
                setShowForm(true);
              }}>
                Crear aula
              </button>
            </div>
          )}

          <div className="table-card">
            <div className="table-header">
              <h3>Listado de aulas</h3>
              <span>{filtered.length} registros</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Capacidad</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((aula) => (
                    <tr key={aula.id_aula}>
                      <td>{aula.codigo_aula}</td>
                      <td>{aula.nombre_aula}</td>
                      <td>{aula.capacidad}</td>
                      <td><span className={`status ${aula.estado.toLowerCase() === "activo" ? "aprobada" : aula.estado.toLowerCase() === "mantenimiento" ? "pendiente" : "aprobada"}`}>{aula.estado}</span></td>
                      <td>
                        <ActionMenu
                          items={[
                            { label: "Editar", onClick: () => handleEdit(aula) },
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
