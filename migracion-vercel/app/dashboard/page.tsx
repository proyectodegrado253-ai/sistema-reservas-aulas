"use client";

import RoleSidebar from "@/components/role-sidebar";
import { isAdminSession, isProfessorSession } from "@/lib/auth";
import { appendAuditEntry, buildHourSlots, overlaps, validateAcademicReservation } from "@/lib/academic-rules";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

type DashboardReservation = {
  id_reserva: number;
  id_usuario: number;
  id_aula: number;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  motivo?: string | null;
  estado?: string;
  aulas?: { codigo_aula?: string; nombre_aula?: string } | null;
  usuarios?: { nombre?: string; apellido?: string; email?: string } | null;
};

type TimelineDraft = {
  id_aula: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
};

function PanelSkeleton() {
  return (
    <div className="panel-skeleton" aria-hidden="true">
      <div className="panel-skeleton-card panel-skeleton-line skeleton-banner" />
      <div className="panel-skeleton-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="panel-skeleton-card panel-skeleton-line skeleton-metric" />
        ))}
      </div>
      <div className="panel-skeleton-card panel-skeleton-line skeleton-panel" />
    </div>
  );
}

function getReservationCountdown(alertReservation: { aula: string; fecha: string; inicio: string; fin: string } | null, now = new Date()) {
  if (!alertReservation) {
    return "Sin clase programada";
  }

  const startAt = new Date(`${alertReservation.fecha}T${alertReservation.inicio}:00`);
  const endAt = new Date(`${alertReservation.fecha}T${alertReservation.fin}:00`);
  const diffMinutes = Math.round((startAt.getTime() - now.getTime()) / 60000);

  if (now >= startAt && now <= endAt) {
    return "RESERVA EN CURSO";
  }

  if (diffMinutes > 0) {
    if (diffMinutes <= 60) {
      return `Comienza en ${diffMinutes} min`;
    }

    return `Inicia a las ${alertReservation.inicio}`;
  }

  if (now > endAt) {
    return "Clase finalizada";
  }

  return "Sin clase programada";
}

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ aulasActivas: 0, reservasEsteMes: 0, aprobadas: 0, pendientes: 0, proximaAula: "Sin reserva"});
  const [recentActivities, setRecentActivities] = useState<Array<{ title: string; time: string }>>([]);
  const [alertReservation, setAlertReservation] = useState<{ aula: string; fecha: string; inicio: string; fin: string } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [timelineDate, setTimelineDate] = useState<string>("");
  const [timelineAulas, setTimelineAulas] = useState<Array<{ id_aula: number; nombre_aula: string; codigo_aula?: string; estado?: string }>>([]);
  const [timelineReservations, setTimelineReservations] = useState<DashboardReservation[]>([]);
  const [roomAssignments, setRoomAssignments] = useState<Record<number, { docente: string; area: string; horario: string; dia: string }>>({});
  const [timelineDraft, setTimelineDraft] = useState<TimelineDraft | null>(null);
  const [timelineMessage, setTimelineMessage] = useState<string>("");
  const [savingTimeline, setSavingTimeline] = useState(false);

  const timelineSlots = useMemo(() => buildHourSlots({ startHour: 7, endHour: 18, stepMinutes: 60 }), []);

  const loadDashboardData = async () => {
    const client = supabase;

    if (!client) {
      setStats({ aulasActivas: 0, reservasEsteMes: 0, aprobadas: 0, pendientes: 0, proximaAula: "Sin reserva" });
      setRecentActivities([]);
      setLoading(false);
      setError("La base de datos no está configurada para mostrar información del dashboard.");
      return;
    }

    try {
      setLoading(true);

      const [aulasResult, reservasResult, horariosResult] = await Promise.all([
        client.from("aulas").select("id_aula, nombre_aula, codigo_aula, estado").order("nombre_aula", { ascending: true }),
        client.from("reservas").select("*, aulas!fk_reservas_aulas(nombre_aula, codigo_aula), usuarios!fk_reservas_usuarios(nombre, apellido, email)").order("fecha_reserva", { ascending: false }),
        client.from("horarios_docentes").select("id_aula, dia_semana, hora_inicio, hora_fin, usuarios!fk_horarios_usuarios(nombre, apellido, area)").order("dia_semana", { ascending: true }),
      ]);

      if (aulasResult.error) {
        throw aulasResult.error;
      }

      if (reservasResult.error) {
        throw reservasResult.error;
      }

      if (horariosResult.error) {
        throw horariosResult.error;
      }

      const assignmentMap: Record<number, { docente: string; area: string; horario: string; dia: string }> = {};
      for (const horario of horariosResult.data ?? []) {
        const idAula = Number(horario.id_aula);
        const usuario = Array.isArray(horario.usuarios) ? horario.usuarios[0] : horario.usuarios;
        const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ").trim();
        const horarioTexto = horario.hora_inicio && horario.hora_fin ? `${horario.hora_inicio.slice(0, 5)} - ${horario.hora_fin.slice(0, 5)}` : "Horario asignado";

        if (!idAula || !nombre) {
          continue;
        }

        assignmentMap[idAula] = {
          docente: nombre,
          area: usuario?.area ?? "Aula institucional",
          horario: horarioTexto,
          dia: horario.dia_semana ?? "Agenda",
        };
      }

      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const reservas = reservasResult.data ?? [];
      const currentUserId = Number(localStorage.getItem("session-user-id") ?? 0);
      const reservasProfesor = reservas.filter((reserva) => Number(reserva.id_usuario) === Number(currentUserId));
      const reservasEsteMes = reservasProfesor.filter((reserva) => {
        const fecha = new Date(reserva.fecha_reserva);
        return !Number.isNaN(fecha.getTime()) && fecha >= monthStart && fecha <= today;
      }).length;
      const aprobadas = reservasProfesor.filter((reserva) => (reserva.estado ?? "").toLowerCase() === "aprobada").length;
      const pendientes = reservasProfesor.filter((reserva) => (reserva.estado ?? "").toLowerCase() === "pendiente").length;
      const nextReservation = [...reservasProfesor]
        .sort((a, b) => `${a.fecha_reserva}T${a.hora_inicio}`.localeCompare(`${b.fecha_reserva}T${b.hora_inicio}`))[0];

      const disponiblesHoy = (aulasResult.data ?? []).filter((aula) => aula.estado === "Activo").length;

      const latestActivities = (reservasProfesor.slice(0, 4) ?? []).map((reserva) => ({
        title: `Reserva ${reserva.estado ?? "Pendiente"}`,
        time: reserva.fecha_reserva ?? "Sin fecha",
      }));

      setTimelineAulas((aulasResult.data ?? []).filter((aula) => aula.estado === "Activo" || !aula.estado).map((aula) => ({
        id_aula: Number(aula.id_aula),
        nombre_aula: aula.nombre_aula ?? `Aula ${aula.id_aula}`,
        codigo_aula: aula.codigo_aula ?? undefined,
        estado: aula.estado ?? "Activo",
      })));
      setTimelineReservations(((reservasResult.data ?? []) as Array<DashboardReservation>).map((reserva) => ({
        ...reserva,
        estado: reserva.estado ?? "Pendiente",
      })));
      setRoomAssignments(assignmentMap);
      setStats({
        aulasActivas: (aulasResult.data ?? []).filter((aula) => aula.estado === "Activo" || !aula.estado).length,
        reservasEsteMes,
        aprobadas,
        pendientes,
        proximaAula: nextReservation?.aulas?.nombre_aula ?? "Sin reserva",
      });
      setAlertReservation(nextReservation ? {
        aula: nextReservation.aulas?.nombre_aula ?? "Aula asignada",
        fecha: nextReservation.fecha_reserva,
        inicio: nextReservation.hora_inicio,
        fin: nextReservation.hora_fin,
      } : null);
      setRecentActivities(latestActivities.length ? latestActivities : [{ title: "Sin actividades recientes", time: "Pendiente" }]);
      setError(null);
    } catch (loadError) {
      console.error("Error cargando dashboard:", loadError);
      setError("No se pudo actualizar la información del dashboard en este momento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tick = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    setTimelineDate(todayIso);

    const storedRole = localStorage.getItem("session-role") ?? "";
    const storedEmail = localStorage.getItem("session-email") ?? "";

    setRole(storedRole);
    setEmail(storedEmail);

    if (!isProfessorSession()) {
      if (isAdminSession()) {
        router.replace("/admin");
        return;
      }

      router.replace("/login");
      return;
    }

    if (storedRole !== "Profesor") {
      router.replace("/login");
      return;
    }

    void loadDashboardData();

    const client = supabase;
    if (!client) return;

    const channel = client
      .channel("dashboard-panel-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "aulas" }, () => {
        void loadDashboardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => {
        void loadDashboardData();
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [router]);

  const activityList = useMemo(() => recentActivities, [recentActivities]);
  const countdownText = useMemo(() => {
    if (!currentTime) {
      return "Cargando estado de la clase...";
    }

    return getReservationCountdown(alertReservation, currentTime);
  }, [alertReservation, currentTime]);

  const timelineGrid = useMemo(() => {
    return timelineAulas.map((aula) => ({
      ...aula,
      slots: timelineSlots.map((slot) => {
        const occupied = timelineReservations.some((reservation) => {
          if (Number(reservation.id_aula) !== Number(aula.id_aula)) {
            return false;
          }

          if (reservation.fecha_reserva !== timelineDate) {
            return false;
          }

          return overlaps(slot.start, slot.end, reservation.hora_inicio, reservation.hora_fin);
        });

        return {
          ...slot,
          occupied,
        };
      }),
    }));
  }, [timelineAulas, timelineReservations, timelineDate, timelineSlots]);

  const roomCards = useMemo(() => {
    return timelineAulas.map((aula) => {
      const room = timelineGrid.find((item) => Number(item.id_aula) === Number(aula.id_aula));
      const nextFreeSlot = room?.slots.find((slot) => !slot.occupied);
      const assignment = roomAssignments[Number(aula.id_aula)];
      const available = !!nextFreeSlot;

      return {
        ...aula,
        assignment,
        nextFreeSlot,
        available,
      };
    });
  }, [roomAssignments, timelineAulas, timelineGrid]);

  const openTimelineSlot = (aulaId: number, slot: { start: string; end: string }) => {
    setTimelineDraft({
      id_aula: aulaId,
      fecha: timelineDate,
      hora_inicio: slot.start,
      hora_fin: slot.end,
      motivo: "Clase / práctica / reunión",
    });
    setTimelineMessage("");
  };

  const openReservationFromCard = (aulaId: number) => {
    const room = timelineGrid.find((item) => Number(item.id_aula) === Number(aulaId));
    const firstAvailable = room?.slots.find((slot) => !slot.occupied);

    if (!firstAvailable) {
      setTimelineMessage("Esta aula no tiene una franja libre en la fecha seleccionada.");
      return;
    }

    openTimelineSlot(aulaId, { start: firstAvailable.start, end: firstAvailable.end });
  };

  const submitTimelineReservation = async () => {
    if (!timelineDraft) return;

    const userId = Number(localStorage.getItem("session-user-id") ?? 0);
    if (!userId || !timelineDraft.id_aula) {
      setTimelineMessage("Debes iniciar sesión como profesor para reservar.");
      return;
    }

    if (!supabase) {
      setTimelineMessage("La base de datos no está configurada para registrar reservas reales.");
      return;
    }

    const payload = {
      id_usuario: userId,
      id_aula: Number(timelineDraft.id_aula),
      fecha_reserva: timelineDraft.fecha,
      hora_inicio: timelineDraft.hora_inicio,
      hora_fin: timelineDraft.hora_fin,
      motivo: timelineDraft.motivo.trim() || "Reserva de aula",
      estado: "Pendiente",
    };

    const validation = validateAcademicReservation({
      reservations: timelineReservations,
      selectedUserId: userId,
      selectedAulaId: Number(timelineDraft.id_aula),
      fecha: timelineDraft.fecha,
      horaInicio: timelineDraft.hora_inicio,
      horaFin: timelineDraft.hora_fin,
    });

    if (!validation.valid) {
      setTimelineMessage(validation.message);
      return;
    }

    try {
      setSavingTimeline(true);
      const { error } = await supabase.from("reservas").insert(payload);

      if (error) {
        throw error;
      }

      appendAuditEntry({
        action: "Reserva desde timeline",
        summary: `Reserva creada para el aula ${timelineDraft.id_aula} el ${timelineDraft.fecha} de ${timelineDraft.hora_inicio} a ${timelineDraft.hora_fin}`,
        userName: localStorage.getItem("session-name") || "Profesor",
        userId,
        state: "Pendiente",
        role: localStorage.getItem("session-role") || "Profesor",
        date: new Date().toISOString(),
      });

      setTimelineMessage("Reserva registrada correctamente.");
      setTimelineDraft(null);
      void loadDashboardData();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "No se pudo guardar la reserva.";
      setTimelineMessage(message);
    } finally {
      setSavingTimeline(false);
    }
  };

  return (
    <main className="page-shell compact-shell">
      <RoleSidebar />

      <section className="content-panel compact-panel">
        <header className="topbar compact-topbar">
          <div>
            <p className="eyebrow">Panel</p>
            <h1>Dashboard</h1>
          </div>
          <div className="user-pill compact-user-pill">
            <span>{role}</span>
            <small>{email}</small>
          </div>
        </header>

        {error ? <div className="info-banner" role="status">{error}</div> : null}

        {loading ? (
          <PanelSkeleton />
        ) : (
          <>
            <div className="stats-grid compact-stats-grid">
              <article className="stat-card compact-stat-card">
                <p>Total reservas</p>
                <strong>{stats.reservasEsteMes}</strong>
              </article>
              <article className="stat-card compact-stat-card">
                <p>Aprobadas</p>
                <strong>{stats.aprobadas}</strong>
              </article>
              <article className="stat-card compact-stat-card">
                <p>Pendientes</p>
                <strong>{stats.pendientes}</strong>
              </article>
              <article className="stat-card compact-stat-card accent">
                <p>Próxima clase</p>
                <strong>{stats.proximaAula}</strong>
              </article>
            </div>

            <section className="dashboard-alert-card">
              <div className="dashboard-alert-header">
                <span className="dashboard-alert-badge">Recordatorio</span>
                <span className="dashboard-alert-date">{alertReservation ? alertReservation.fecha : "Sin reserva"}</span>
              </div>

              <div className="dashboard-alert-body">
                <div>
                  <p>Tu reserva del día</p>
                  <strong>{alertReservation ? alertReservation.aula : "Sin reserva programada"}</strong>
                </div>
                <span>
                  {alertReservation
                    ? `${alertReservation.inicio} - ${alertReservation.fin}`
                    : "No tienes ninguna reserva activa para hoy."}
                </span>
              </div>

              <div className="dashboard-alert-countdown" aria-live="polite">
                {countdownText}
              </div>

              <div className="dashboard-alert-actions">
                <a href="/reservas" className="primary-button compact-link">Ver reservas</a>
                <a href="/perfil" className="secondary-button compact-link">Perfil</a>
              </div>
            </section>

            <section className="dashboard-agenda-card">
              <div className="dashboard-agenda-header">
                <div>
                  <p className="eyebrow">Agenda</p>
                  <h3>Mi agenda para hoy</h3>
                </div>
                <span>
                  {timelineDate
                    ? new Date(`${timelineDate}T00:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })
                    : "Hoy"}
                </span>
              </div>

              <div className="dashboard-agenda-list">
                {timelineGrid.map((aula) => {
                  const freeCount = aula.slots.filter((slot) => !slot.occupied).length;

                  return (
                    <div key={aula.id_aula} className="agenda-room-card">
                      <div className="agenda-room-head">
                        <div>
                          <span className="agenda-room-code">{aula.codigo_aula ?? "AULA"}</span>
                          <strong>{aula.nombre_aula}</strong>
                        </div>
                        <span className="agenda-room-free">{freeCount} libres</span>
                      </div>

                      <div className="agenda-track" aria-label={`Agenda de ${aula.nombre_aula}`}>
                        {aula.slots.map((slot) => (
                          <button
                            key={`${aula.id_aula}-${slot.start}`}
                            type="button"
                            className={slot.occupied ? "agenda-slot occupied" : "agenda-slot free"}
                            onClick={() => !slot.occupied && openTimelineSlot(aula.id_aula, { start: slot.start, end: slot.end })}
                            title={slot.occupied ? `${aula.nombre_aula} ocupada ${slot.start} - ${slot.end}` : `Reservar ${aula.nombre_aula} ${slot.start} - ${slot.end}`}
                          >
                            <span>{slot.occupied ? "Ocupado" : slot.start}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {timelineMessage ? <div className="dashboard-inline-message">{timelineMessage}</div> : null}
          </>
        )}
      </section>

      {timelineDraft ? (
        <div className="timeline-modal-backdrop" onClick={() => setTimelineDraft(null)}>
          <div className="timeline-modal" onClick={(event) => event.stopPropagation()}>
            <div className="timeline-modal-header">
              <div>
                <p>Reserva rápida</p>
                <h3>{timelineAulas.find((aula) => aula.id_aula === timelineDraft.id_aula)?.nombre_aula ?? "Aula"}</h3>
              </div>
              <button type="button" className="timeline-close" onClick={() => setTimelineDraft(null)}>×</button>
            </div>

            <div className="timeline-summary-grid">
              <div>
                <span>Fecha</span>
                <strong>{timelineDraft.fecha}</strong>
              </div>
              <div>
                <span>Hora</span>
                <strong>{timelineDraft.hora_inicio} - {timelineDraft.hora_fin}</strong>
              </div>
            </div>

            <label className="timeline-form-field">
              Motivo / materia
              <textarea
                value={timelineDraft.motivo}
                onChange={(event) => setTimelineDraft((current) => current ? { ...current, motivo: event.target.value } : current)}
                rows={3}
                placeholder="Ej. Clase, laboratorio, tutoría..."
              />
            </label>

            {timelineMessage ? <div className="timeline-message compact">{timelineMessage}</div> : null}

            <div className="timeline-modal-actions">
              <button type="button" className="secondary-button" onClick={() => setTimelineDraft(null)}>
                Cancelar
              </button>
              <button type="button" className="primary-button" onClick={submitTimelineReservation} disabled={savingTimeline}>
                {savingTimeline ? "Guardando..." : "Confirmar reserva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
