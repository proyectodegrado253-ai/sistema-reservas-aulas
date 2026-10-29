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

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ aulasActivas: 0, reservasEsteMes: 0, disponiblesHoy: 0 });
  const [recentActivities, setRecentActivities] = useState<Array<{ title: string; time: string }>>([]);
  const [timelineDate, setTimelineDate] = useState<string>("");
  const [timelineAulas, setTimelineAulas] = useState<Array<{ id_aula: number; nombre_aula: string; codigo_aula?: string; estado?: string }>>([]);
  const [timelineReservations, setTimelineReservations] = useState<DashboardReservation[]>([]);
  const [roomAssignments, setRoomAssignments] = useState<Record<number, { docente: string; area: string; horario: string; dia: string }>>({});
  const [timelineDraft, setTimelineDraft] = useState<TimelineDraft | null>(null);
  const [timelineMessage, setTimelineMessage] = useState<string>("");
  const [savingTimeline, setSavingTimeline] = useState(false);

  const timelineSlots = useMemo(() => buildHourSlots({ startHour: 6, endHour: 22, stepMinutes: 60 }), []);

  const loadDashboardData = async () => {
    const client = supabase;

    if (!client) {
      setStats({ aulasActivas: 0, reservasEsteMes: 0, disponiblesHoy: 0 });
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
      const reservasEsteMes = reservas.filter((reserva) => {
        const fecha = new Date(reserva.fecha_reserva);
        return !Number.isNaN(fecha.getTime()) && fecha >= monthStart && fecha <= today;
      }).length;

      const disponiblesHoy = (aulasResult.data ?? []).filter((aula) => aula.estado === "Activo").length;

      const latestActivities = (reservas.slice(0, 4) ?? []).map((reserva) => ({
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
        disponiblesHoy,
      });
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
              <article className="stat-card accent compact-stat-card">
                <p>Aulas activas</p>
                <strong>{stats.aulasActivas}</strong>
              </article>
              <article className="stat-card compact-stat-card">
                <p>Reservas este mes</p>
                <strong>{String(stats.reservasEsteMes).padStart(2, "0")}</strong>
              </article>
              <article className="stat-card compact-stat-card">
                <p>Disponibles hoy</p>
                <strong>{String(stats.disponiblesHoy).padStart(2, "0")}</strong>
              </article>
            </div>

            <section className="room-assignment-panel">
              <div className="room-assignment-header">
                <div>
                  <p className="eyebrow">Aulas especializadas</p>
                  <h3>Asignación institucional</h3>
                </div>
                <span>{timelineAulas.length} aulas activas</span>
              </div>

              <div className="room-assignment-grid">
                {roomCards.map((aula) => (
                  <button
                    key={aula.id_aula}
                    type="button"
                    className={aula.available ? "room-card available" : "room-card occupied"}
                    onClick={() => openReservationFromCard(aula.id_aula)}
                  >
                    <div className="room-card-top">
                      <div>
                        <span className="room-code">{aula.codigo_aula ?? "AULA"}</span>
                        <strong>{aula.nombre_aula}</strong>
                      </div>
                      <span className={aula.available ? "room-status available" : "room-status occupied"}>
                        {aula.available ? "Libre" : "Ocupada"}
                      </span>
                    </div>

                    <div className="room-card-body">
                      <div className="room-teacher-block">
                        <span>Docente asignado</span>
                        <strong>{aula.assignment?.docente ?? "Sin asignación"}</strong>
                        <small>{aula.assignment?.area ?? "Área institucional"}</small>
                      </div>

                      <div className="room-meta-row">
                        <span>{aula.assignment?.dia ?? "Agenda"}</span>
                        <strong>{aula.assignment?.horario ?? (aula.nextFreeSlot ? `Libre ${aula.nextFreeSlot.start}` : "Sin horario")}</strong>
                      </div>
                    </div>

                    <div className="room-card-footer">
                      <small>{aula.available ? "Reservar en la franja disponible" : "Ver disponibilidad"}</small>
                      <span>{aula.available ? "Reservar" : "Revisar"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="timeline-panel">
              <div className="timeline-toolbar">
                <div className="timeline-heading-wrap">
                  <h3>Línea de tiempo</h3>
                  <span>Disponibilidad por aula</span>
                </div>
                <div className="timeline-date-actions">
                  {[0, 1, 2].map((offset) => {
                    const date = new Date();
                    date.setDate(date.getDate() + offset);
                    const iso = date.toISOString().slice(0, 10);
                    const label = offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

                    return (
                      <button
                        key={iso}
                        type="button"
                        className={timelineDate === iso ? "timeline-date active" : "timeline-date"}
                        onClick={() => setTimelineDate(iso)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="timeline-scroll">
                <div
                  className="timeline-grid"
                  style={{ gridTemplateColumns: `minmax(170px, 210px) repeat(${timelineSlots.length}, minmax(86px, 1fr))` }}
                >
                  <div className="timeline-header-cell timeline-top-left">Aula</div>
                  {timelineSlots.map((slot) => (
                    <div key={slot.label} className="timeline-header-cell">
                      {slot.start}
                    </div>
                  ))}

                  {timelineGrid.map((aula) => (
                    <Fragment key={aula.id_aula}>
                      <div className="timeline-aula-label">
                        <strong>{aula.nombre_aula}</strong>
                        <small>{aula.codigo_aula ?? "Aula"}</small>
                      </div>
                      {aula.slots.map((slot) => (
                        <button
                          key={`${aula.id_aula}-${slot.start}`}
                          type="button"
                          className={slot.occupied ? "timeline-cell occupied" : "timeline-cell available"}
                          onClick={() => !slot.occupied && openTimelineSlot(aula.id_aula, { start: slot.start, end: slot.end })}
                          disabled={slot.occupied}
                          title={slot.occupied ? `${aula.nombre_aula} ocupada ${slot.start}-${slot.end}` : `Reservar ${aula.nombre_aula} ${slot.start}-${slot.end}`}
                        >
                          {slot.occupied ? "Ocupado" : "Libre"}
                        </button>
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>

              {timelineMessage ? <div className="timeline-message">{timelineMessage}</div> : null}
            </section>

            <div className="dashboard-layout compact-dashboard-layout">
              <article className="info-card dashboard-section compact-info-card">
                <div className="section-header">
                  <h3>Próximas reservas</h3>
                  <span>Agenda</span>
                </div>
                <ul className="list">
                  {activityList.length ? activityList.map((activity) => (
                    <li key={`${activity.title}-${activity.time}`}>{activity.title} — {activity.time}</li>
                  )) : <li>Sin reservas registradas.</li>}
                </ul>
              </article>

              <article className="info-card dashboard-section activity-card compact-info-card">
                <div className="section-header">
                  <h3>Registro de actividades</h3>
                  <span>Reciente</span>
                </div>
                <ul className="activity-list">
                  {activityList.map((activity) => (
                    <li key={`${activity.title}-${activity.time}`}>
                      <span className="activity-dot" />
                      <div>
                        <strong>{activity.title}</strong>
                        <small>{activity.time}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
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

            <div className="timeline-modal-body">
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
                  placeholder="Ej. Clase de programación, lab, tutoría..."
                />
              </label>
            </div>

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
