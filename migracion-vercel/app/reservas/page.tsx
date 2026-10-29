"use client";

import ActionMenu from "@/components/action-menu";
import RoleSidebar from "@/components/role-sidebar";
import { isAdminSession, isProfessorSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseStatus, supabase } from "@/lib/supabase";
import { appendAuditEntry, overlaps, validateAcademicReservation } from "@/lib/academic-rules";

const timeSlots = Array.from({ length: 13 }, (_, index) => {
  const startHour = 7 + index;
  const start = `${String(startHour).padStart(2, "0")}:00`;
  const end = `${String(startHour + 1).padStart(2, "0")}:00`;
  return { start, end, label: `${start} - ${end}` };
});

type ReservaRecord = {
  id_reserva: number;
  id_usuario: number;
  id_aula: number;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  estado: string;
  usuarios?: { nombre?: string; apellido?: string; email?: string } | null;
  aulas?: { codigo_aula?: string; nombre_aula?: string } | null;
};

type FormState = {
  id_reserva: number | null;
  id_usuario: string;
  id_aula: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  estado: string;
};

const emptyForm: FormState = {
  id_reserva: null,
  id_usuario: "",
  id_aula: "",
  fecha: "",
  hora_inicio: "09:00",
  hora_fin: "11:00",
  motivo: "",
  estado: "Pendiente",
};

const menuItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Reservas", href: "/reservas" },
  { label: "Aulas", href: "/reservas" },
  { label: "Usuarios", href: "/registro" },
  { label: "Horarios", href: "/reservas" },
  { label: "Reportes", href: "/admin" },
  { label: "Salir", href: "/login" },
];

const fallbackLocalData: ReservaRecord[] = [
  {
    id_reserva: 1,
    id_usuario: 1,
    id_aula: 1,
    fecha_reserva: "2026-10-15",
    hora_inicio: "09:00",
    hora_fin: "11:00",
    motivo: "Clase de programación",
    estado: "Pendiente",
    usuarios: { nombre: "Admin", apellido: "Sistema", email: "admin@sistema.com" },
    aulas: { codigo_aula: "A-101", nombre_aula: "Aula 101" },
  },
  {
    id_reserva: 2,
    id_usuario: 2,
    id_aula: 2,
    fecha_reserva: "2026-10-16",
    hora_inicio: "12:00",
    hora_fin: "14:00",
    motivo: "Reunión de coordinación",
    estado: "Pendiente",
    usuarios: { nombre: "Ana", apellido: "Gómez", email: "ana.gomez@institucion.edu" },
    aulas: { codigo_aula: "LAB-2", nombre_aula: "Laboratorio 2" },
  },
];

export default function ReservasPage() {
  const router = useRouter();
  const [reservas, setReservas] = useState<ReservaRecord[]>([]);
  const [usuarios, setUsuarios] = useState<Array<Record<string, any>>>([]);
  const [aulas, setAulas] = useState<Array<Record<string, any>>>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const role = typeof window !== "undefined" ? localStorage.getItem("session-role") : "Profesor";
  const currentUserId = typeof window !== "undefined" ? Number(localStorage.getItem("session-user-id") ?? 0) : 0;
  const isAdmin = role === "Superadministrador";
  const currentUser = usuarios.find((usuario) => Number(usuario.id_usuario) === Number(currentUserId));
  const currentUserName = currentUser
    ? `${currentUser.nombre ?? ""} ${currentUser.apellido ?? ""}`.trim()
    : (typeof window !== "undefined" ? localStorage.getItem("session-name") : null) || "Profesor";

  const isOwnedByCurrentTeacher = (reserva: ReservaRecord) => {
    if (isAdmin) {
      return true;
    }

    return Number(reserva.id_usuario) === Number(currentUserId);
  };

  const availabilitySummary = useMemo(() => {
    const activeStart = form.hora_inicio || selectedSlot?.start || "09:00";
    const activeEnd = form.hora_fin || selectedSlot?.end || "10:00";

    if (!form.fecha || !activeStart || !activeEnd) {
      return aulas.map((aula) => ({
        id_aula: Number(aula.id_aula),
        nombre_aula: aula.nombre_aula,
        disponible: true,
      }));
    }

    return aulas.map((aula) => {
      const conflict = reservas.some((reserva) => {
        return Number(reserva.id_aula) === Number(aula.id_aula)
          && reserva.fecha_reserva === form.fecha
          && overlaps(activeStart, activeEnd, reserva.hora_inicio, reserva.hora_fin);
      });

      return {
        id_aula: Number(aula.id_aula),
        nombre_aula: aula.nombre_aula,
        disponible: !conflict,
      };
    });
  }, [aulas, reservas, form.fecha, form.hora_inicio, form.hora_fin, selectedSlot]);

  const professorUsuarios = useMemo(() => {
    return usuarios.filter((usuario) => {
      const roleName = usuario.roles?.nombre_rol ?? (Number(usuario.id_rol) === 1 ? "Superadministrador" : "Profesor");
      return roleName === "Profesor";
    });
  }, [usuarios]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => window.clearInterval(tick);
  }, []);

  const normalizeText = (value: string | null | undefined) =>
    (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const getReservationState = (reservation: ReservaRecord, now: Date) => {
    const startAt = new Date(`${reservation.fecha_reserva}T${reservation.hora_inicio}:00`);
    const endAt = new Date(`${reservation.fecha_reserva}T${reservation.hora_fin}:00`);
    const diffMinutes = Math.round((startAt.getTime() - now.getTime()) / 60000);
    const isToday = reservation.fecha_reserva === now.toISOString().slice(0, 10);

    if (!isToday) {
      return { label: reservation.estado, tone: reservation.estado.toLowerCase(), isActive: false };
    }

    if (now >= startAt && now <= endAt) {
      return { label: "RESERVA EN CURSO (INICIAR SEGUIMIENTO)", tone: "active", isActive: true };
    }

    if (diffMinutes > 0 && diffMinutes <= 15) {
      return { label: `Faltan ${diffMinutes} min`, tone: "warning", isActive: false };
    }

    if (diffMinutes > 0) {
      return { label: `Faltan ${diffMinutes} min`, tone: "upcoming", isActive: false };
    }

    if (now > endAt) {
      return { label: "Finalizada", tone: "cancelada", isActive: false };
    }

    return { label: reservation.estado, tone: reservation.estado.toLowerCase(), isActive: false };
  };

  const loadData = async () => {
    const savedReservas = JSON.parse(localStorage.getItem("cache-reservas") ?? "null") as ReservaRecord[] | null;
    const savedUsuarios = JSON.parse(localStorage.getItem("cache-usuarios") ?? "null") as Array<Record<string, any>> | null;
    const savedAulas = JSON.parse(localStorage.getItem("cache-aulas") ?? "null") as Array<Record<string, any>> | null;
    const currentUserIdFromStorage = Number(localStorage.getItem("session-user-id") ?? 0);
    const currentRole = localStorage.getItem("session-role") ?? "Profesor";

    if (!supabase) {
      setReservas([]);
      setUsuarios([]);
      setAulas([]);
      setMessage("Supabase no está configurado. No se pueden listar reservas reales sin la conexión al proyecto.");
      return;
    }

    try {
      const reservasQuery = supabase
        .from("reservas")
        .select("*, usuarios!fk_reservas_usuarios(nombre, apellido, email), aulas!fk_reservas_aulas(codigo_aula, nombre_aula)")
        .order("fecha_reserva", { ascending: false });

      const [usuariosResult, aulasResult, reservasResult] = await Promise.all([
        supabase.from("usuarios").select("*").order("nombre", { ascending: true }),
        supabase.from("aulas").select("*").order("nombre_aula", { ascending: true }),
        reservasQuery,
      ]);

      if (usuariosResult.error || aulasResult.error || reservasResult.error) {
        throw usuariosResult.error ?? aulasResult.error ?? reservasResult.error ?? new Error("Sin datos disponibles");
      }

      const nextUsuarios = (usuariosResult.data as Array<Record<string, any>> | null)?.length ? (usuariosResult.data as Array<Record<string, any>>) : [];
      const nextAulas = (aulasResult.data as Array<Record<string, any>> | null)?.length ? (aulasResult.data as Array<Record<string, any>>) : [];
      const nextReservas = (reservasResult.data as ReservaRecord[] | null)?.length ? (reservasResult.data as ReservaRecord[]) : [];
      const visibleReservas = currentRole === "Superadministrador"
        ? nextReservas
        : nextReservas.filter((reserva) => Number(reserva.id_usuario) === Number(currentUserIdFromStorage));

      localStorage.setItem("cache-usuarios", JSON.stringify(nextUsuarios));
      localStorage.setItem("cache-aulas", JSON.stringify(nextAulas));
      localStorage.setItem("cache-reservas", JSON.stringify(visibleReservas));
      setReservas(visibleReservas);
      setUsuarios(nextUsuarios);
      setAulas(nextAulas);
    } catch (error) {
      setReservas([]);
      setUsuarios([]);
      setAulas([]);
      setMessage("No se pudo cargar la información de reservas desde Supabase. Verifica la conexión y permisos del proyecto.");
      console.warn("Fallo en Supabase para reservas.", error);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("session-role");

    if (!isProfessorSession() && !isAdminSession()) {
      router.replace("/login");
      return;
    }

    if (!isAdminSession() && role !== "Profesor") {
      router.replace("/login");
      return;
    }

    loadData();
  }, [router]);

  const visibleUsuarios = useMemo(() => {
    if (isAdmin) return professorUsuarios;
    return usuarios.filter((usuario) => Number(usuario.id_usuario) === Number(currentUserId));
  }, [usuarios, isAdmin, currentUserId, professorUsuarios]);

  const visibleReservas = useMemo(() => {
    if (isAdmin) return reservas;
    return reservas.filter((reserva) => isOwnedByCurrentTeacher(reserva));
  }, [reservas, isAdmin, currentUserId, isOwnedByCurrentTeacher]);

  const filteredReservas = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return visibleReservas;

    return visibleReservas.filter((reserva) => {
      const haystack = [
        reserva.aulas?.nombre_aula ?? "",
        reserva.aulas?.codigo_aula ?? "",
        reserva.usuarios?.nombre ?? "",
        reserva.usuarios?.apellido ?? "",
        reserva.usuarios?.email ?? "",
        reserva.motivo ?? "",
        reserva.estado,
      ].join(" ");
      return normalizeText(haystack).includes(query);
    });
  }, [visibleReservas, search]);

  const totalPages = Math.max(1, Math.ceil(filteredReservas.length / 5));
  const paginatedReservas = useMemo(() => {
    const start = (currentPage - 1) * 5;
    return filteredReservas.slice(start, start + 5);
  }, [filteredReservas, currentPage]);

  const todayKey = currentTime ? currentTime.toISOString().slice(0, 10) : "";
  const monthKey = currentTime ? currentTime.toISOString().slice(0, 7) : "";

  const teacherReservations = useMemo(
    () => visibleReservas.filter((reserva) => Number(reserva.id_usuario) === Number(currentUserId)),
    [visibleReservas, currentUserId],
  );

  const nextTeacherReservation = useMemo(() => {
    return [...teacherReservations].sort((a, b) => {
      const aValue = `${a.fecha_reserva}T${a.hora_inicio}`;
      const bValue = `${b.fecha_reserva}T${b.hora_inicio}`;
      return aValue.localeCompare(bValue);
    })[0];
  }, [teacherReservations]);

  const getCurrentUserLabel = () => {
    const userName = currentUserName || "Profesor";
    return userName.trim() || "Profesor";
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "hora_inicio" || field === "hora_fin") {
      setSelectedSlot({ start: field === "hora_inicio" ? value : form.hora_inicio || "09:00", end: field === "hora_fin" ? value : form.hora_fin || "10:00" });
    }
  };

  const handleSelectSlot = (slot: { start: string; end: string }) => {
    setSelectedSlot(slot);
    setForm((current) => ({ ...current, hora_inicio: slot.start, hora_fin: slot.end }));
  };

  const persistReservationLocally = (payload: Record<string, any>, isEditing: boolean) => {
    const selectedUser = usuarios.find((usuario) => Number(usuario.id_usuario) === Number(payload.id_usuario)) ?? currentUser ?? null;
    const userLabel = selectedUser ? `${selectedUser.nombre ?? ""} ${selectedUser.apellido ?? ""}`.trim() : getCurrentUserLabel();

    setForm(emptyForm);
    setMessage(
      isEditing
        ? `No se pudo actualizar la reserva de ${userLabel}. La base de datos no está disponible o no tiene permisos para guardar cambios.`
        : `No se pudo guardar la reserva de ${userLabel}. La base de datos no está disponible o no tiene permisos para guardar cambios.`,
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const connectionStatus = getSupabaseStatus();
    const resolvedUserId = isAdmin ? Number(form.id_usuario) : Number(currentUserId || form.id_usuario || 0);

    const finalEstado = "Pendiente";

    const payload = {
      id_usuario: resolvedUserId,
      id_aula: Number(form.id_aula),
      fecha_reserva: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      motivo: form.motivo,
      estado: finalEstado,
    };

    try {
      if (resolvedUserId === 0 || !Number(form.id_aula)) {
        throw new Error("Debes seleccionar una aula y un usuario válido.");
      }

      const existingReservas = JSON.parse(localStorage.getItem("cache-reservas") ?? "[]") as ReservaRecord[];
      const validation = validateAcademicReservation({
        reservations: existingReservas.length ? existingReservas : reservas,
        selectedUserId: resolvedUserId,
        selectedAulaId: Number(form.id_aula),
        fecha: form.fecha,
        horaInicio: form.hora_inicio,
        horaFin: form.hora_fin,
        currentReservationId: form.id_reserva ?? undefined,
      });

      if (!validation.valid) {
        setMessage(validation.message);
        setSaving(false);
        return;
      }

      if (!supabase) {
        const errorMessage = connectionStatus.message || "La base de datos no está disponible para guardar la reserva.";
        throw new Error(errorMessage);
      } else {
        if (form.id_reserva) {
          const { error } = await supabase.from("reservas").update(payload).eq("id_reserva", form.id_reserva);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("reservas").insert(payload);
          if (error) throw error;
        }
        appendAuditEntry({
          action: form.id_reserva ? "Actualización de reserva" : "Creación de reserva",
          summary: `Reserva ${form.id_reserva ? "actualizada" : "creada"} para ${getCurrentUserLabel()} en ${form.fecha} de ${form.hora_inicio} a ${form.hora_fin}`,
          userName: getCurrentUserLabel(),
          userId: resolvedUserId,
          state: finalEstado,
          role: role ?? "Profesor",
          date: new Date().toISOString(),
        });
        await loadData();
        window.dispatchEvent(new Event("reservas-updated"));
      }

      setMessage(form.id_reserva ? "Reserva actualizada correctamente y queda en revisión." : "Reserva registrada correctamente y queda pendiente de aprobación.");
      setForm(emptyForm);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: string }).message ?? "")
            : "No se pudo guardar la reserva. Revisa los datos o la conexión con Supabase.";
      const errorCode = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code ?? "") : "";
      const permissionBlocked =
        errorCode.includes("42501") ||
        errorCode.includes("401") ||
        errorMessage.toLowerCase().includes("row-level security") ||
        errorMessage.toLowerCase().includes("policy") ||
        errorMessage.toLowerCase().includes("401");

      if (permissionBlocked) {
        setMessage(
          "No se pudo guardar la reserva porque la base de datos no tiene permisos para registrar este dato. Revisa la configuración de Supabase.",
        );
        return;
      }

      setMessage(errorMessage || "No se pudo guardar la reserva. Revisa los datos o la conexión con Supabase.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (reserva: ReservaRecord) => {
    setSelectedSlot({ start: reserva.hora_inicio, end: reserva.hora_fin });
    setForm({
      id_reserva: reserva.id_reserva,
      id_usuario: String(reserva.id_usuario ?? ""),
      id_aula: String(reserva.id_aula ?? ""),
      fecha: reserva.fecha_reserva,
      hora_inicio: reserva.hora_inicio,
      hora_fin: reserva.hora_fin,
      motivo: reserva.motivo ?? "",
      estado: reserva.estado,
    });
    setMessage("Editando reserva actual.");
  };

  useEffect(() => {
    if (!selectedSlot && form.hora_inicio && form.hora_fin) {
      setSelectedSlot({ start: form.hora_inicio, end: form.hora_fin });
    }
  }, [form.hora_inicio, form.hora_fin, selectedSlot]);

  return (
    <main className="page-shell">
      <RoleSidebar />

      <section className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Gestión</p>
            <h1>{isAdmin ? "Reservas" : "Mis reservas"}</h1>
          </div>
          <button className="primary-button" type="button" onClick={() => setForm(emptyForm)}>
            Nueva solicitud
          </button>
        </header>

        <div className="reservas-controls">
          <div className="search-box">
            <span>Buscar</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar aula, docente o motivo"
            />
          </div>
        </div>

        <div className="booking-grid modern-booking-grid">
          <form className="form-card modern-form-card" onSubmit={handleSubmit}>
            <div className="modern-form-header">
              <div>
                <p className="eyebrow">Nueva reserva</p>
                <h3>{form.id_reserva ? "Editar reserva" : "Registrar nueva reserva"}</h3>
              </div>
            </div>

            <div className="stat-compact-panel">
              <div className="stat-compact-item">
                <span>Total Reservas Mes</span>
                <strong>{monthKey ? teacherReservations.filter((reserva) => reserva.fecha_reserva.startsWith(monthKey)).length : 0}</strong>
              </div>
              <div className="stat-compact-item success">
                <span>Reservas Aprobadas</span>
                <strong>{teacherReservations.filter((reserva) => reserva.estado === "Aprobada").length}</strong>
              </div>
              <div className="stat-compact-item warning">
                <span>Reservas Pendientes</span>
                <strong>{teacherReservations.filter((reserva) => reserva.estado === "Pendiente").length}</strong>
              </div>
              <div className="stat-compact-item info">
                <span>Próxima Aula</span>
                <strong>{nextTeacherReservation?.aulas?.nombre_aula ?? "Sin reserva"}</strong>
              </div>
            </div>

            <div className="user-readonly-card">
              <div className="user-readonly-icon">👤</div>
              <div>
                <span>Docente responsable</span>
                <strong>{isAdmin ? (visibleUsuarios.find((usuario) => String(usuario.id_usuario) === form.id_usuario) ? `${visibleUsuarios.find((usuario) => String(usuario.id_usuario) === form.id_usuario)?.nombre ?? ""} ${visibleUsuarios.find((usuario) => String(usuario.id_usuario) === form.id_usuario)?.apellido ?? ""}`.trim() : "Selecciona un docente") : currentUserName}</strong>
              </div>
            </div>

            <div className="form-grid modern-form-grid">
              {isAdmin ? (
                <label className="full-width">
                  Usuario
                  <select value={form.id_usuario} onChange={(event) => handleChange("id_usuario", event.target.value)}>
                    <option value="">Selecciona usuario</option>
                    {visibleUsuarios.map((usuario) => (
                      <option key={usuario.id_usuario} value={usuario.id_usuario}>
                        {usuario.nombre} {usuario.apellido}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="full-width">
                Aula especializada
                <select value={form.id_aula} onChange={(event) => handleChange("id_aula", event.target.value)}>
                  <option value="">Selecciona aula</option>
                  {aulas.map((aula) => (
                    <option key={aula.id_aula} value={aula.id_aula}>
                      {aula.nombre_aula} · {aula.codigo_aula}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fecha
                <input type="date" value={form.fecha} onChange={(event) => handleChange("fecha", event.target.value)} />
              </label>

              <div className="slot-summary">
                <span>Bloque horario</span>
                <strong>{selectedSlot ? `${selectedSlot.start} - ${selectedSlot.end}` : "Selecciona un bloque"}</strong>
              </div>

              <div className="time-slot-grid full-width">
                {timeSlots.map((slot) => {
                  const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                  return (
                    <button
                      key={slot.label}
                      type="button"
                      className={isSelected ? "time-slot active" : "time-slot"}
                      onClick={() => handleSelectSlot(slot)}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>

              <label className="full-width">
                Motivo / actividad
                <textarea
                  value={form.motivo}
                  onChange={(event) => handleChange("motivo", event.target.value)}
                  placeholder="Ej: Clase de laboratorio, reunión académica, tutoría, práctica, etc."
                />
              </label>
            </div>

            <div className="availability-panel">
              <div className="availability-header">
                <h4>Disponibilidad</h4>
                <span>{form.fecha ? "Horario activo" : "Selecciona fecha"}</span>
              </div>
              <div className="availability-list">
                {availabilitySummary.map((item) => (
                  <div key={item.id_aula} className={`availability-item ${item.disponible ? "available" : "busy"}`}>
                    <span>{item.nombre_aula}</span>
                    <strong>{item.disponible ? "Disponible" : "Ocupada"}</strong>
                  </div>
                ))}
              </div>
            </div>

            {message ? <p className="form-feedback">{message}</p> : null}

            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={() => setForm(emptyForm)}>
                Cancelar
              </button>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? "Guardando..." : form.id_reserva ? "Guardar cambios" : "Solicitar reserva"}
              </button>
            </div>
          </form>

          <div className="table-card modern-history-card">
            <div className="table-header">
              <div>
                <h3>Historial de reservas</h3>
                <span>{filteredReservas.length} registros</span>
              </div>
              <div className="history-pagination">
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                  ‹
                </button>
                <span>{currentPage} / {totalPages}</span>
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages}>
                  ›
                </button>
              </div>
            </div>

            {(() => {
              const todayDate = todayKey;
              const nextTodayReservation = todayDate
                ? [...visibleReservas]
                    .filter((reserva) => reserva.fecha_reserva === todayDate)
                    .sort((a, b) => `${a.fecha_reserva}T${a.hora_inicio}`.localeCompare(`${b.fecha_reserva}T${b.hora_inicio}`))[0]
                : null;

              if (!nextTodayReservation) {
                return null;
              }

              return (
                <div className="upcoming-reminder-card">
                  <div className="reminder-pill">RECORDATORIO</div>
                  <div className="reminder-body">
                    <div>
                      <p>Tu próxima reserva es HOY</p>
                      <strong>{nextTodayReservation.aulas?.nombre_aula ?? "Aula no disponible"}</strong>
                    </div>
                    <span>{nextTodayReservation.fecha_reserva} · {nextTodayReservation.hora_inicio} - {nextTodayReservation.hora_fin}</span>
                  </div>
                  <button type="button" className="secondary-button compact" onClick={() => setSearch(nextTodayReservation.aulas?.nombre_aula ?? "")}>
                    Ver detalle
                  </button>
                </div>
              );
            })()}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Docente</th>
                    <th>Aula</th>
                    <th>Horario</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReservas.length ? (
                    paginatedReservas.map((reserva) => {
                      const liveState = currentTime
                        ? getReservationState(reserva, currentTime)
                        : { label: reserva.estado, tone: reserva.estado.toLowerCase(), isActive: false };
                      const teacherName = `${reserva.usuarios?.nombre ?? ""} ${reserva.usuarios?.apellido ?? ""}`.trim() || "Docente";

                      return (
                        <tr key={reserva.id_reserva} className={liveState.isActive ? "row-live" : ""}>
                          <td>{isAdmin ? teacherName : currentUserName}</td>
                          <td>{reserva.aulas?.nombre_aula ?? "Sin aula"}</td>
                          <td>
                            {reserva.fecha_reserva} · {reserva.hora_inicio} - {reserva.hora_fin}
                          </td>
                          <td>
                            <span className={`status ${liveState.tone}`}>
                              {liveState.label}
                            </span>
                          </td>
                          <td>
                            <ActionMenu
                              items={[
                                { label: "Editar", onClick: () => handleEdit(reserva) },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No se encontraron resultados para esta búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
