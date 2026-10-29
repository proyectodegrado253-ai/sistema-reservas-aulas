"use client";

import ActionMenu from "@/components/action-menu";
import RoleSidebar from "@/components/role-sidebar";
import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { type HorarioPayload } from "@/lib/horario-extractor";

type HorarioRecord = {
  id_horario: number;
  id_usuario: number;
  id_aula: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  usuarios?: { nombre?: string; apellido?: string } | null;
  aulas?: { nombre_aula?: string; codigo_aula?: string } | null;
};

type FormState = {
  id_horario: number | null;
  id_usuario: string;
  id_aula: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
};

const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const emptyForm: FormState = {
  id_horario: null,
  id_usuario: "",
  id_aula: "",
  dia_semana: "Lunes",
  hora_inicio: "08:00",
  hora_fin: "10:00",
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const getLocalStorageJson = <T,>(key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
};

const saveHorariosToLocal = (records: HorarioRecord[]) => {
  localStorage.setItem("cache-horarios", JSON.stringify(records));
};

const getProfessorLabel = (usuario?: Record<string, any> | null) => {
  if (!usuario) return "Sin profesor";
  return `${usuario.nombre ?? ""} ${usuario.apellido ?? ""}`.trim() || usuario.email || "Profesor";
};

const resolveHorarioDisplay = (
  idUsuario: number | null,
  idAula: number | null,
  currentUsuarios: Array<Record<string, any>>,
  currentAulas: Array<Record<string, any>>,
) => {
  const profesor = currentUsuarios.find((usuario) => Number(usuario.id_usuario) === Number(idUsuario));
  const aula = currentAulas.find((room) => Number(room.id_aula) === Number(idAula));

  return {
    usuario: profesor ?? { nombre: "Docente", apellido: "Sistema" },
    aula: aula ?? { nombre_aula: "Aula asignada", codigo_aula: "SISTEMA" },
  };
};

const saveSingleHorario = async (payload: { id_usuario: number; id_aula: number; dia_semana: string; hora_inicio: string; hora_fin: string }) => {
  if (!supabase) {
    const current = getLocalStorageJson<HorarioRecord[]>("cache-horarios") ?? [];
    const actualUsuarios = getLocalStorageJson<Array<Record<string, any>>>("cache-usuarios") ?? [];
    const actualAulas = getLocalStorageJson<Array<Record<string, any>>>("cache-aulas") ?? [];
    const display = resolveHorarioDisplay(payload.id_usuario, payload.id_aula, actualUsuarios, actualAulas);

    const next: HorarioRecord = {
      id_horario: Date.now(),
      id_usuario: payload.id_usuario,
      id_aula: payload.id_aula,
      dia_semana: payload.dia_semana,
      hora_inicio: payload.hora_inicio,
      hora_fin: payload.hora_fin,
      usuarios: { nombre: display.usuario.nombre, apellido: display.usuario.apellido },
      aulas: { nombre_aula: display.aula.nombre_aula, codigo_aula: display.aula.codigo_aula },
    };
    const updated = [next, ...current];
    saveHorariosToLocal(updated);
    return updated;
  }

  const { error } = await supabase.from("horarios_docentes").insert({
    id_usuario: payload.id_usuario,
    id_aula: payload.id_aula,
    dia_semana: payload.dia_semana,
    hora_inicio: payload.hora_inicio,
    hora_fin: payload.hora_fin,
  });

  if (error) {
    throw error;
  }

  return null;
};

export default function HorariosPage() {
  const [horarios, setHorarios] = useState<HorarioRecord[]>([]);
  const [usuarios, setUsuarios] = useState<Array<Record<string, any>>>([]);
  const [aulas, setAulas] = useState<Array<Record<string, any>>>([]);
  const [search, setSearch] = useState("");
  const [selectedProfessorId, setSelectedProfessorId] = useState<string>("");
  const [bulkText, setBulkText] = useState("");
  const [bulkParsedHorarios, setBulkParsedHorarios] = useState<HorarioPayload[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const role = typeof window !== "undefined" ? localStorage.getItem("session-role") : "Profesor";
  const currentUserId = typeof window !== "undefined" ? Number(localStorage.getItem("session-user-id") ?? 0) : 0;
  const isAdmin = role === "Superadministrador";

  const loadData = async () => {
    const currentRole = localStorage.getItem("session-role") ?? "Profesor";
    const currentUserIdFromStorage = Number(localStorage.getItem("session-user-id") ?? 0);

    try {
      if (!supabase) {
        setUsuarios([]);
        setAulas([]);
        setHorarios([]);
        setSelectedProfessorId(currentRole === "Superadministrador" ? "" : String(currentUserIdFromStorage || ""));
        setMessage("Supabase no está configurado. Debes conectar con tu proyecto real para gestionar horarios docentes.");
        return;
      }

      const horariosQuery = currentRole === "Superadministrador"
        ? supabase.from("horarios_docentes").select("*, usuarios(nombre, apellido, email), aulas(nombre_aula, codigo_aula)").order("dia_semana", { ascending: true })
        : supabase.from("horarios_docentes").select("*, usuarios(nombre, apellido, email), aulas(nombre_aula, codigo_aula)").eq("id_usuario", Number(currentUserIdFromStorage)).order("dia_semana", { ascending: true });

      const [usuariosResult, aulasResult, horariosResult] = await Promise.all([
        supabase.from("usuarios").select("*").order("nombre", { ascending: true }),
        supabase.from("aulas").select("*").order("nombre_aula", { ascending: true }),
        horariosQuery,
      ]);

      if (usuariosResult.error || aulasResult.error || horariosResult.error) {
        throw usuariosResult.error ?? aulasResult.error ?? horariosResult.error ?? new Error("Sin datos disponibles");
      }

      const nextUsuarios = (usuariosResult.data as Array<Record<string, any>> | null)?.length ? (usuariosResult.data as Array<Record<string, any>>) : [];
      const nextAulas = (aulasResult.data as Array<Record<string, any>> | null)?.length ? (aulasResult.data as Array<Record<string, any>>) : [];
      const nextHorarios = (horariosResult.data as HorarioRecord[] | null)?.length ? (horariosResult.data as HorarioRecord[]) : [];
      const visibleHorarios = currentRole === "Superadministrador"
        ? nextHorarios
        : nextHorarios.filter((horario) => Number(horario.id_usuario) === Number(currentUserIdFromStorage));

      localStorage.setItem("cache-usuarios", JSON.stringify(nextUsuarios));
      localStorage.setItem("cache-aulas", JSON.stringify(nextAulas));
      localStorage.setItem("cache-horarios", JSON.stringify(visibleHorarios));
      setUsuarios(nextUsuarios);
      setAulas(nextAulas);
      setHorarios(visibleHorarios);
      setSelectedProfessorId(currentRole === "Superadministrador" ? "" : String(currentUserIdFromStorage || ""));
    } catch (error) {
      setUsuarios([]);
      setAulas([]);
      setHorarios([]);
      setSelectedProfessorId(currentRole === "Superadministrador" ? "" : String(currentUserIdFromStorage || ""));
      setMessage("No se pudo cargar la información de horarios desde Supabase. Revisa la conexión y los permisos del proyecto.");
      console.warn("Fallo en Supabase para horarios.", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isAdmin && currentUserId) {
      setSelectedProfessorId(String(currentUserId));
    }
  }, [isAdmin, currentUserId]);

  const visibleHorarios = useMemo(() => {
    if (isAdmin) return horarios;
    return horarios.filter((horario) => Number(horario.id_usuario) === Number(currentUserId));
  }, [horarios, isAdmin, currentUserId]);

  const filtered = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return visibleHorarios;

    return visibleHorarios.filter((horario) => {
      const haystack = [
        horario.dia_semana,
        horario.usuarios?.nombre ?? "",
        horario.usuarios?.apellido ?? "",
        horario.aulas?.nombre_aula ?? "",
        horario.aulas?.codigo_aula ?? "",
      ].join(" ");
      return normalizeText(haystack).includes(query);
    });
  }, [visibleHorarios, search]);

  const teacherSchedule = useMemo(() => {
    const activeProfessorId = isAdmin ? selectedProfessorId : String(currentUserId || "");
    if (!activeProfessorId) return [];
    return visibleHorarios.filter((horario) => Number(horario.id_usuario) === Number(activeProfessorId));
  }, [visibleHorarios, selectedProfessorId, isAdmin, currentUserId]);

  const previewSchedule = useMemo(() => {
    if (bulkParsedHorarios.length) {
      return bulkParsedHorarios;
    }
    return isAdmin && selectedProfessorId ? teacherSchedule : visibleHorarios;
  }, [bulkParsedHorarios, teacherSchedule, visibleHorarios, isAdmin, selectedProfessorId]);

  const previewTimeSlots = useMemo(
    () => Array.from({ length: 12 }, (_, index) => `${String(7 + index).padStart(2, "0")}:00`),
    [],
  );

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const hydrateFormFromExtracted = (items: HorarioPayload[]) => {
    if (!items.length) return;
    const first = items[0];
    setForm({
      id_horario: null,
      id_usuario: String(first.id_usuario),
      id_aula: String(first.id_aula),
      dia_semana: first.dia_semana,
      hora_inicio: first.hora_inicio,
      hora_fin: first.hora_fin,
    });
    setSelectedProfessorId(String(first.id_usuario));
  };

  const hasDuplicateHorario = (
    payload: { id_usuario: number; id_aula: number; dia_semana: string; hora_inicio: string; hora_fin: string },
    ignoreHorarioId?: number | null,
  ) =>
    horarios.some((horario) => {
      if (ignoreHorarioId && Number(horario.id_horario) === Number(ignoreHorarioId)) {
        return false;
      }
      return Number(horario.id_usuario) === Number(payload.id_usuario)
        && Number(horario.id_aula) === Number(payload.id_aula)
        && horario.dia_semana === payload.dia_semana
        && horario.hora_inicio === payload.hora_inicio
        && horario.hora_fin === payload.hora_fin;
    });

  const parseTextoMasivo = (texto: string) => {
    if (!texto.trim()) return [] as HorarioPayload[];

    const mappedUsuarios = usuarios.map((usuario) => ({
      id_usuario: Number(usuario.id_usuario),
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
    }));

    const mappedAulas = aulas.map((aula) => ({
      id_aula: Number(aula.id_aula),
      codigo_aula: aula.codigo_aula,
      nombre_aula: aula.nombre_aula,
    }));

    const lines = texto
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const results: HorarioPayload[] = [];
    const seen = new Set<string>();

    for (const row of lines) {
      const dayMatch = weekDays.find((day) => normalizeText(row).includes(normalizeText(day))) ?? null;
      const timeMatch = row.match(/(\d{1,2}:\d{2})\s*(?:-|–|a|al|hasta)\s*(\d{1,2}:\d{2})/i);

      if (!dayMatch || !timeMatch) continue;

      const professor = mappedUsuarios.find((usuario) => {
        const fullName = normalizeText(`${usuario.nombre ?? ""} ${usuario.apellido ?? ""}`);
        return fullName && normalizeText(row).includes(fullName);
      }) ?? mappedUsuarios[0];

      const aula = mappedAulas.find((item) => {
        const haystack = normalizeText(`${item.codigo_aula ?? ""} ${item.nombre_aula ?? ""}`);
        return haystack && normalizeText(row).includes(haystack);
      }) ?? mappedAulas[0];

      if (!professor || !aula) continue;

      const start = timeMatch[1].padStart(5, "0");
      const end = timeMatch[2].padStart(5, "0");
      const key = `${professor.id_usuario}|${aula.id_aula}|${dayMatch}|${start}|${end}`;
      if (seen.has(key)) continue;

      seen.add(key);
      results.push({
        id_usuario: professor.id_usuario,
        id_aula: aula.id_aula,
        dia_semana: dayMatch,
        hora_inicio: start,
        hora_fin: end,
        fuente: "manual",
      });
    }

    return results;
  };

  const handleProcessText = () => {
    const parsed = parseTextoMasivo(bulkText);
    if (!parsed.length) {
      setMessage("No se detectaron horarios válidos. Revisa el formato y usa líneas con día, hora y aula.");
      return;
    }

    setBulkParsedHorarios(parsed);
    hydrateFormFromExtracted(parsed);
    setMessage(`Se detectaron ${parsed.length} bloques de horario. Revisa la vista previa antes de aplicarlos.`);
  };

  const persistParsedHorarios = async (itemsToSave: HorarioPayload[] = bulkParsedHorarios) => {
    if (!itemsToSave.length) {
      setMessage("No hay horarios en la vista previa para guardar.");
      return;
    }

    setSaving(true);

    try {
      const deduplicated: HorarioPayload[] = [];
      const seen = new Set<string>();

      for (const item of itemsToSave) {
        const key = `${item.id_usuario}|${item.id_aula}|${item.dia_semana}|${item.hora_inicio}|${item.hora_fin}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (hasDuplicateHorario(item, form.id_horario ?? null)) {
          const professorName = getProfessorLabel(usuarios.find((usuario) => Number(usuario.id_usuario) === Number(item.id_usuario)));
          setMessage(`No se puede guardar porque el horario de ${professorName} ya existe.`);
          return;
        }

        deduplicated.push(item);
      }

      if (!supabase) {
        const current = getLocalStorageJson<HorarioRecord[]>("cache-horarios") ?? [];
        const mapped = deduplicated.map((item) => {
          const display = resolveHorarioDisplay(item.id_usuario, item.id_aula, usuarios, aulas);
          return {
            id_horario: Date.now() + Math.random(),
            id_usuario: item.id_usuario,
            id_aula: item.id_aula,
            dia_semana: item.dia_semana,
            hora_inicio: item.hora_inicio,
            hora_fin: item.hora_fin,
            usuarios: { nombre: display.usuario.nombre, apellido: display.usuario.apellido },
            aulas: { nombre_aula: display.aula.nombre_aula, codigo_aula: display.aula.codigo_aula },
          } satisfies HorarioRecord;
        });
        const updated = [...mapped, ...current];
        saveHorariosToLocal(updated);
        setHorarios(updated);
      } else {
        for (const item of deduplicated) {
          await saveSingleHorario(item);
        }
        await loadData();
      }

      setBulkText("");
      setBulkParsedHorarios([]);
      setMessage(`Se aplicaron correctamente ${deduplicated.length} horarios desde el texto.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo aplicar el lote de horarios.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const resolvedIdUsuario = isAdmin ? Number(form.id_usuario) || Number(usuarios[0]?.id_usuario ?? 0) : Number(currentUserId || form.id_usuario || usuarios[0]?.id_usuario || 0);
    const resolvedIdAula = Number(form.id_aula) || Number(aulas[0]?.id_aula ?? 0);

    const payload = {
      id_usuario: resolvedIdUsuario,
      id_aula: resolvedIdAula,
      dia_semana: form.dia_semana,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
    };

    try {
      if (!payload.id_usuario || !payload.id_aula) {
        throw new Error("No hay profesores o aulas disponibles para registrar el horario.");
      }

      if (hasDuplicateHorario(payload, form.id_horario ?? null)) {
        throw new Error("Ya existe ese horario para ese docente y aula en ese día y horario.");
      }

      if (!supabase) {
        const current = getLocalStorageJson<HorarioRecord[]>("cache-horarios") ?? [];
        const display = resolveHorarioDisplay(payload.id_usuario, payload.id_aula, usuarios, aulas);
        const updated = form.id_horario
          ? current.map((item) => (item.id_horario === form.id_horario ? { ...item, ...payload, usuarios: { nombre: display.usuario.nombre, apellido: display.usuario.apellido }, aulas: { nombre_aula: display.aula.nombre_aula, codigo_aula: display.aula.codigo_aula } } : item))
          : [{ ...payload, id_horario: Date.now(), usuarios: { nombre: display.usuario.nombre, apellido: display.usuario.apellido }, aulas: { nombre_aula: display.aula.nombre_aula, codigo_aula: display.aula.codigo_aula } }, ...current];
        const filteredUpdated = updated.filter((item) => isAdmin || Number(item.id_usuario) === Number(currentUserId));
        saveHorariosToLocal(filteredUpdated);
        setHorarios(filteredUpdated);
      } else {
        if (form.id_horario) {
          const { error } = await supabase.from("horarios_docentes").update(payload).eq("id_horario", form.id_horario);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("horarios_docentes").insert(payload);
          if (error) throw error;
        }
        await loadData();
      }

      setMessage(form.id_horario ? "Horario actualizado correctamente." : "Horario registrado correctamente.");
      setSelectedProfessorId(String(payload.id_usuario));
      setForm(isAdmin ? emptyForm : { ...emptyForm, id_usuario: String(resolvedIdUsuario) });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el horario.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (horario: HorarioRecord) => {
    setForm({
      id_horario: horario.id_horario,
      id_usuario: String(horario.id_usuario ?? ""),
      id_aula: String(horario.id_aula ?? ""),
      dia_semana: horario.dia_semana,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
    });
    setSelectedProfessorId(String(horario.id_usuario));
    setMessage("Editando horario seleccionado.");
  };

  const handleDelete = async (id_horario: number) => {
    if (!id_horario) return;
    const confirmed = window.confirm("¿Seguro que quieres eliminar este horario?");
    if (!confirmed) return;

    try {
      if (!supabase) {
        const current = getLocalStorageJson<HorarioRecord[]>("cache-horarios") ?? [];
        const updated = current.filter((item) => item.id_horario !== id_horario);
        saveHorariosToLocal(updated);
        setHorarios(updated);
      } else {
        const { error } = await supabase.from("horarios_docentes").delete().eq("id_horario", id_horario);
        if (error) throw error;
        await loadData();
      }
      setMessage("Horario eliminado correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar el horario.");
      console.error(error);
    }
  };

  return (
    <main className="page-shell">
      <RoleSidebar />

      <section className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">{isAdmin ? "Administración" : "Docente"}</p>
            <h1>{isAdmin ? "Horarios" : "Mi horario semanal"}</h1>
          </div>
          {isAdmin ? (
            <button className="primary-button" type="button" onClick={() => setForm(emptyForm)}>
              Nuevo horario
            </button>
          ) : null}
        </header>

        <div className="reservas-controls">
          <div className="search-box">
            <span>Buscar</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Docente, aula o día" />
          </div>
        </div>

        <div className="horario-workspace">
          <div className="horario-panel form-panel-modern">
            <div className="panel-header-section">
              <div>
                <p className="eyebrow">Carga masiva</p>
                <h3>Carga rápida por texto</h3>
              </div>
            </div>

            <div className="bulk-upload-box">
              <textarea
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                className="bulk-textarea"
                placeholder={`Ejemplo:\nLunes 08:00-10:00 | Aula A-101 | Profesor Ana Gómez\nMartes 12:00-14:00 | Aula LAB-2 | Profesor Carlos Serrano`}
              />

              <div className="bulk-actions">
                <button type="button" className="primary-button" onClick={handleProcessText}>
                  Procesar texto
                </button>
                <button type="button" className="secondary-button" onClick={() => setBulkText("")}>
                  Limpiar
                </button>
              </div>

              {bulkParsedHorarios.length ? (
                <button type="button" className="primary-button wide-button" onClick={() => persistParsedHorarios()} disabled={saving}>
                  {saving ? "Aplicando..." : `Aplicar ${bulkParsedHorarios.length} horarios`}
                </button>
              ) : null}
            </div>
          </div>

          <form className="horario-panel form-panel-modern" onSubmit={handleSubmit}>
            <div className="panel-header-section">
              <div>
                <p className="eyebrow">Registro</p>
                <h3>{form.id_horario ? "Editar horario" : "Formulario manual"}</h3>
              </div>
            </div>

            <div className="form-grid">
              {!isAdmin ? null : (
                <label>
                  Docente
                  <select value={form.id_usuario} onChange={(event) => handleChange("id_usuario", event.target.value)}>
                    <option value="">Selecciona docente</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id_usuario} value={usuario.id_usuario}>{getProfessorLabel(usuario)}</option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Aula
                <select value={form.id_aula} onChange={(event) => handleChange("id_aula", event.target.value)}>
                  <option value="">Selecciona aula</option>
                  {aulas.map((aula) => (
                    <option key={aula.id_aula} value={aula.id_aula}>{aula.nombre_aula}</option>
                  ))}
                </select>
              </label>

              <label>
                Día
                <select value={form.dia_semana} onChange={(event) => handleChange("dia_semana", event.target.value)}>
                  {weekDays.map((dia) => (
                    <option key={dia} value={dia}>{dia}</option>
                  ))}
                </select>
              </label>

              <label>
                Hora inicio
                <input type="time" value={form.hora_inicio} onChange={(event) => handleChange("hora_inicio", event.target.value)} />
              </label>

              <label>
                Hora fin
                <input type="time" value={form.hora_fin} onChange={(event) => handleChange("hora_fin", event.target.value)} />
              </label>
            </div>

            {message ? <p className="form-feedback">{message}</p> : null}

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? "Guardando..." : form.id_horario ? "Actualizar" : "Guardar horario"}
              </button>
              <button type="button" className="secondary-button" onClick={() => setForm(emptyForm)}>
                Limpiar
              </button>
            </div>
          </form>
        </div>

        <div className="horario-preview-panel horario-panel">
          <div className="panel-header-section preview-header">
            <div>
              <p className="eyebrow">Vista previa</p>
              <h3>Horario semanal generado</h3>
            </div>
            {isAdmin ? (
              <select value={selectedProfessorId} onChange={(event) => setSelectedProfessorId(event.target.value)}>
                <option value="">Todos los docentes</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id_usuario} value={usuario.id_usuario}>{getProfessorLabel(usuario)}</option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="schedule-matrix-wrapper">
            <div className="schedule-matrix">
              <div className="matrix-corner">Hora</div>
              {weekDays.map((day) => (
                <div key={day} className="matrix-header-cell">{day}</div>
              ))}

              {previewTimeSlots.map((slot) => (
                <Fragment key={slot}>
                  <div className="matrix-hour-label">{slot}</div>
                  {weekDays.map((day) => {
                    const slotEntry = previewSchedule.find((item) => item.dia_semana === day && item.hora_inicio === slot);
                    const slotAula = slotEntry && "aulas" in slotEntry ? slotEntry.aulas?.nombre_aula : aulas.find((aula) => Number(aula.id_aula) === Number((slotEntry as any)?.id_aula))?.nombre_aula;
                    const slotProfessor = slotEntry && "usuarios" in slotEntry ? slotEntry.usuarios?.nombre : usuarios.find((usuario) => Number(usuario.id_usuario) === Number((slotEntry as any)?.id_usuario))?.nombre;

                    return (
                      <div key={`${day}-${slot}`} className={`matrix-cell ${slotEntry ? "filled" : ""}`}>
                        {slotEntry ? (
                          <div className="matrix-cell-content">
                            <strong>{slotAula ?? "Aula"}</strong>
                            <small>{slotProfessor ?? "Docente"}</small>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="table-card horario-table-card">
          <div className="table-header">
            <div>
              <h3>Horarios registrados</h3>
              <span>{filtered.length} registros</span>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Aula</th>
                  <th>Día</th>
                  <th>Horario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(isAdmin && selectedProfessorId ? teacherSchedule : filtered).map((horario) => (
                  <tr key={horario.id_horario}>
                    <td>{getProfessorLabel(usuarios.find((usuario) => Number(usuario.id_usuario) === Number(horario.id_usuario)) ?? horario.usuarios)}</td>
                    <td>{horario.aulas?.nombre_aula ?? "Sin aula"}</td>
                    <td>{horario.dia_semana}</td>
                    <td>{horario.hora_inicio} - {horario.hora_fin}</td>
                    <td>
                      {isAdmin ? (
                        <ActionMenu
                          items={[
                            { label: "Editar", onClick: () => handleEdit(horario) },
                            { label: "Eliminar", variant: "danger", onClick: () => handleDelete(horario.id_horario) },
                          ]}
                        />
                      ) : (
                        <button type="button" className="secondary-button" onClick={() => handleEdit(horario)}>
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
