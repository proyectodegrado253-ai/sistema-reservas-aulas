"use client";

import RoleSidebar from "@/components/role-sidebar";
import { isAdminSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ReservationRecord = {
  id_reserva: number;
  id_usuario: number;
  id_aula: number;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  motivo?: string | null;
  estado?: string | null;
  usuarios?: { nombre?: string; apellido?: string; email?: string } | null;
  aulas?: { nombre_aula?: string; codigo_aula?: string } | null;
};

type ActivityRow = {
  hora: string;
  usuario: string;
  accion: string;
  detalle: string;
};

const roomCatalog = [
  "Aula Especializada Matemáticas",
  "Aula Especializada Informática",
  "Aula Especializada Innovación",
  "Punto Vive Digital",
  "Laboratorio de Biología",
  "Laboratorio de Química",
  "Laboratorio de Física",
  "Salón de Humanidades",
  "Biblioteca",
  "Sala de Salud",
  "Sala de Diseño",
  "Sala de Arte",
];

const dayLabels = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const fallbackRoomStatus = [
  ["Disponible", "Disponible", "Reservado", "Disponible", "Disponible"],
  ["Ocupado", "Disponible", "Disponible", "Reservado", "Disponible"],
  ["Disponible", "Reservado", "Disponible", "Disponible", "Ocupado"],
  ["Disponible", "Disponible", "Disponible", "Reservado", "Disponible"],
  ["Reservado", "Disponible", "Disponible", "Disponible", "Disponible"],
  ["Disponible", "Ocupado", "Disponible", "Reservado", "Disponible"],
  ["Disponible", "Disponible", "Reservado", "Disponible", "Disponible"],
  ["Reservado", "Disponible", "Disponible", "Disponible", "Ocupado"],
  ["Disponible", "Disponible", "Disponible", "Reservado", "Disponible"],
  ["Disponible", "Reservado", "Disponible", "Disponible", "Disponible"],
  ["Disponible", "Disponible", "Ocupado", "Disponible", "Reservado"],
  ["Reservado", "Disponible", "Disponible", "Ocupado", "Disponible"],
];

const toTitle = (value?: string | null) => (value ?? "").trim();

function PanelSkeleton() {
  return (
    <div className="panel-skeleton" aria-hidden="true">
      <div className="panel-skeleton-card panel-skeleton-line skeleton-banner" />
      <div className="panel-skeleton-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="panel-skeleton-card panel-skeleton-line skeleton-metric" />
        ))}
      </div>
      <div className="panel-skeleton-card panel-skeleton-line skeleton-panel" />
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState({
    docentesActivos: 0,
    aulasHabilitadas: 0,
    totalReservas: 0,
    pendientes: 0,
  });
  const [queue, setQueue] = useState<ReservationRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const roomMatrix = useMemo(() => {
    return roomCatalog.map((room, idx) => ({
      room,
      status: fallbackRoomStatus[idx] ?? Array(5).fill("Disponible"),
    }));
  }, []);

  const loadStats = async () => {
    const client = supabase;

    if (!client) {
      setStats({ docentesActivos: 30, aulasHabilitadas: 12, totalReservas: 35, pendientes: 2 });
      setQueue([
        {
          id_reserva: 1,
          id_aula: 1,
          id_usuario: 101,
          fecha_reserva: "2026-10-30",
          hora_inicio: "08:00",
          hora_fin: "10:00",
          motivo: "Clase de apoyo en matemáticas",
          estado: "Pendiente",
          usuarios: { nombre: "Charris", apellido: "Sarmiento", email: "charris@institucion.edu" },
          aulas: { nombre_aula: "Aula Especializada Matemáticas", codigo_aula: "A-101" },
        },
        {
          id_reserva: 2,
          id_aula: 2,
          id_usuario: 102,
          fecha_reserva: "2026-10-30",
          hora_inicio: "10:00",
          hora_fin: "12:00",
          motivo: "Taller de programación",
          estado: "Pendiente",
          usuarios: { nombre: "Ruth", apellido: "Sarmiento", email: "ruth@institucion.edu" },
          aulas: { nombre_aula: "Aula Especializada Informática", codigo_aula: "A-102" },
        },
      ]);
      setActivities([
        { hora: "12:45", usuario: "Admin Z", accion: "Aprobó horario", detalle: "Matemáticas - Charris Sarmiento" },
        { hora: "12:30", usuario: "Profesor X", accion: "Nueva reserva", detalle: "Informática - 09:00" },
      ]);
      setLoading(false);
      setError("La base de datos no está conectada; se muestran métricas y solicitudes pre-cargadas del entorno institucional.");
      return;
    }

    try {
      setLoading(true);
      const [usuariosResult, aulasResult, reservasResult] = await Promise.all([
        client.from("usuarios").select("id_usuario, nombre, apellido, estado, id_rol").order("nombre", { ascending: true }),
        client.from("aulas").select("id_aula, nombre_aula, codigo_aula, estado").order("nombre_aula", { ascending: true }),
        client.from("reservas").select("*, usuarios(nombre, apellido, email), aulas(nombre_aula, codigo_aula)").order("fecha_reserva", { ascending: false }),
      ]);

      if (usuariosResult.error) throw usuariosResult.error;
      if (aulasResult.error) throw aulasResult.error;
      if (reservasResult.error) throw reservasResult.error;

      const usuarios = usuariosResult.data ?? [];
      const aulas = aulasResult.data ?? [];
      const reservas = reservasResult.data as ReservationRecord[] | [];
      const pendingReservations = reservas.filter((reserva) => (reserva.estado ?? "").toLowerCase() === "pendiente");

      setStats({
        docentesActivos: usuarios.filter((usuario) => String(usuario.estado ?? "").toLowerCase() === "activo").length,
        aulasHabilitadas: aulas.filter((aula) => String(aula.estado ?? "").toLowerCase() === "activo").length,
        totalReservas: reservas.length,
        pendientes: pendingReservations.length,
      });
      setQueue(pendingReservations.slice(0, 6));
      setActivities(
        reservas.slice(0, 4).map((reserva) => ({
          hora: (reserva.fecha_reserva ?? "").slice(5, 10).replace("-", "/") || "Hoy",
          usuario: `${toTitle(reserva.usuarios?.nombre)} ${toTitle(reserva.usuarios?.apellido)}`.trim() || "Docente",
          accion: reserva.estado ?? "Reservada",
          detalle: `${reserva.aulas?.nombre_aula ?? "Aula institucional"} - ${reserva.hora_inicio ?? "09:00"}`,
        })),
      );
      setError(null);
    } catch (loadError) {
      console.error("Error cargando métricas del panel admin:", loadError);
      setError("No se pudieron actualizar las métricas del panel en este momento.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (idReserva: number, decision: "Aprobada" | "Rechazada") => {
    if (!supabase) {
      setQueue((current) => current.filter((item) => Number(item.id_reserva) !== Number(idReserva)));
      setMessage(`Solicitud ${decision.toLowerCase()} para la reserva ${idReserva}.`);
      return;
    }

    try {
      const { error } = await supabase.from("reservas").update({ estado: decision }).eq("id_reserva", idReserva);

      if (error) {
        throw error;
      }

      setQueue((current) => current.filter((item) => Number(item.id_reserva) !== Number(idReserva)));
      setMessage(`Reserva ${idReserva} marcada como ${decision.toLowerCase()}.`);
      await loadStats();
    } catch (updateError) {
      console.error("Error actualizando reserva:", updateError);
      setError("No se pudo actualizar el estado de la reserva. Revisa la conexión y vuelve a intentarlo.");
    }
  };

  const exportCsv = (name: string, rows: Array<Record<string, string | number>>) => {
    const headers = Object.keys(rows[0] ?? { Fecha: "", Usuario: "", Aula: "", Estado: "" });
    const csv = [headers.join(",")]
      .concat(
        rows.map((row) =>
          headers
            .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
            .join(","),
        ),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const role = localStorage.getItem("session-role");
    const sessionEmail = localStorage.getItem("session-email") ?? "";

    if (!isAdminSession()) {
      if (role === "Profesor") {
        router.replace("/dashboard");
        return;
      }
      router.replace("/login");
      return;
    }

    setEmail(sessionEmail || "");
    void loadStats();

    const client = supabase;
    if (!client) {
      return;
    }

    const channel = client
      .channel("admin-panel-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "usuarios" }, () => {
        void loadStats();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => {
        void loadStats();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "aulas" }, () => {
        void loadStats();
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [router]);

  return (
    <main className="page-shell admin-shell compact-shell">
      <RoleSidebar />

      <section className="content-panel admin-content compact-panel">
        <header className="topbar admin-topbar compact-topbar">
          <div className="admin-header-copy">
            <p className="eyebrow">Administración</p>
            <h1>Panel general</h1>
          </div>

          <div className="user-pill admin-pill compact-user-pill">
            <span>Superadministrador</span>
            <small>{email || "Sin sesión activa"}</small>
          </div>
        </header>

        {error ? <div className="info-banner" role="status">{error}</div> : null}
        {message ? <div className="info-banner success-banner" role="status">{message}</div> : null}

        {loading ? (
          <PanelSkeleton />
        ) : (
          <>
            <div className="stats-grid admin-stats-grid compact-stats-grid">
              <article className="stat-card accent compact-stat-card">
                <div className="stat-row">
                  <span className="stat-icon">◫</span>
                  <p>Solicitudes pendientes</p>
                </div>
                <strong>{stats.pendientes}</strong>
                <small>Ir a validar</small>
              </article>

              <article className="stat-card compact-stat-card">
                <div className="stat-row">
                  <span className="stat-icon">◌</span>
                  <p>Docentes activos</p>
                </div>
                <strong>{stats.docentesActivos}</strong>
                <small>Activos</small>
              </article>

              <article className="stat-card compact-stat-card">
                <div className="stat-row">
                  <span className="stat-icon">▣</span>
                  <p>Aulas habilitadas</p>
                </div>
                <strong>{stats.aulasHabilitadas}</strong>
                <small>12 oficiales</small>
              </article>

              <article className="stat-card compact-stat-card">
                <div className="stat-row">
                  <span className="stat-icon">☑</span>
                  <p>Reservas totales</p>
                </div>
                <strong>{stats.totalReservas}</strong>
                <small>Este mes</small>
              </article>
            </div>

            <div className="admin-two-column">
              <article className="info-card admin-card compact-info-card validation-card">
                <div className="section-header">
                  <h3>Cola de validación rápida</h3>
                  <span>Hoy</span>
                </div>

                <div className="validation-table-wrap">
                  <table className="validation-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Docente</th>
                        <th>Aula</th>
                        <th>Día/Hora</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.length ? (
                        queue.map((reserva, index) => (
                          <tr key={reserva.id_reserva}>
                            <td>{index + 1}</td>
                            <td>{`${reserva.usuarios?.nombre ?? ""} ${reserva.usuarios?.apellido ?? ""}`.trim() || "Docente"}</td>
                            <td>{reserva.aulas?.nombre_aula ?? "Aula institucional"}</td>
                            <td>{`${reserva.fecha_reserva} · ${reserva.hora_inicio} - ${reserva.hora_fin}`}</td>
                            <td>
                              <div className="decision-group">
                                <button type="button" className="mini-btn success" onClick={() => handleDecision(reserva.id_reserva, "Aprobada")}>Aprobar</button>
                                <button type="button" className="mini-btn danger" onClick={() => handleDecision(reserva.id_reserva, "Rechazada")}>Rechazar</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="empty-cell">No hay solicitudes pendientes.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="info-card admin-card compact-info-card matrix-card">
                <div className="section-header">
                  <h3>Estado de aulas especializadas</h3>
                  <span>Estado</span>
                </div>

                <div className="matrix-table-wrap">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th className="room-cell">Aula</th>
                        {dayLabels.map((day) => (
                          <th key={day}>{day.slice(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roomMatrix.map(({ room, status }) => (
                        <tr key={room}>
                          <td className="room-cell">{room}</td>
                          {status.map((value, idx) => (
                            <td key={`${room}-${idx}`}>
                              <span
                                className={`status-badge ${value.toLowerCase() === "reservado" || value.toLowerCase() === "ocupado" ? "danger" : value.toLowerCase() === "disponible" ? "success" : "warning"}`}
                              >
                                {value}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>

            <article className="info-card export-panel compact-info-card">
              <div className="section-header export-header">
                <h3>Generar reportes institucionales</h3>
              </div>

              <div className="export-actions">
                <button type="button" className="primary-btn" onClick={() => exportCsv("usuarios-institucionales", [
                  { Fecha: "2026-10-29", Usuario: "Admin Z", Aula: "Aula Especializada Matemáticas", Estado: "Aprobada" },
                  { Fecha: "2026-10-29", Usuario: "Profesor X", Aula: "Laboratorio de Física", Estado: "Pendiente" },
                ])}>Exportar usuarios a Excel</button>
                <button type="button" className="primary-btn" onClick={() => window.print()}>Exportar aulas a PDF</button>
                <button type="button" className="primary-btn" onClick={() => exportCsv("horarios-institucionales", [
                  { Fecha: "2026-10-29", Aula: "Laboratorio de Química", Horario: "08:00 - 10:00", Docente: "Ana Mercado" },
                  { Fecha: "2026-10-29", Aula: "Punto Vive Digital", Horario: "10:00 - 12:00", Docente: "Luis García" },
                ])}>Exportar horarios a CSV</button>
                <button type="button" className="primary-btn alt" onClick={() => exportCsv("historico-reservas", [
                  { Fecha: "2026-10-29", Usuario: "Profesor X", Aula: "Sala de Arte", Estado: "Aprobada" },
                  { Fecha: "2026-10-28", Usuario: "Docente Y", Aula: "Biblioteca", Estado: "Rechazada" },
                ])}>Descargar historial de reservas</button>
              </div>
            </article>

            <article className="info-card admin-card compact-info-card activity-panel">
              <div className="section-header">
                <h3>Actividad institucional reciente</h3>
                <span>Actual</span>
              </div>

              <div className="activity-table-wrap">
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Usuario</th>
                      <th>Acción</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.length ? (
                      activities.map((activity) => (
                        <tr key={`${activity.hora}-${activity.usuario}-${activity.detalle}`}>
                          <td>{activity.hora}</td>
                          <td>{activity.usuario}</td>
                          <td>{activity.accion}</td>
                          <td>{activity.detalle}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-cell">No hay actividad reciente disponible.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </>
        )}
      </section>
    </main>
  );
}
