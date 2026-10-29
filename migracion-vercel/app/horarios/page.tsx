"use client";

import RoleSidebar from "@/components/role-sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

type RoomItem = {
  id_aula: number;
  nombre_aula: string;
  codigo_aula: string;
  icon: string;
  estado?: string;
};

type ReservationItem = {
  id_reserva: number;
  id_aula: number;
  id_usuario: number;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  motivo?: string | null;
  estado?: string;
  usuarios?: { nombre?: string; apellido?: string; email?: string } | null;
  aulas?: { nombre_aula?: string; codigo_aula?: string } | null;
};

type DraftReservation = {
  id_reserva?: number;
  roomId: number;
  roomName: string;
  date: string;
  start: string;
  end: string;
  teacher: string;
  subject: string;
};

const defaultRooms: RoomItem[] = [
  { id_aula: 1, nombre_aula: "Matemáticas", codigo_aula: "A-101", icon: "📐" },
  { id_aula: 2, nombre_aula: "Informática", codigo_aula: "A-102", icon: "💻" },
  { id_aula: 3, nombre_aula: "Innovación", codigo_aula: "A-103", icon: "💡" },
  { id_aula: 4, nombre_aula: "Punto Vive Digital", codigo_aula: "A-104", icon: "📡" },
  { id_aula: 5, nombre_aula: "Química", codigo_aula: "A-106", icon: "🧪" },
];

const defaultReservations: ReservationItem[] = [
  { id_reserva: 1, id_aula: 1, id_usuario: 2, fecha_reserva: "2026-10-29", hora_inicio: "08:00", hora_fin: "10:00", motivo: "Matemáticas", estado: "Pendiente", usuarios: { nombre: "Charris", apellido: "Sarmiento Yira Paulina" }, aulas: { nombre_aula: "Matemáticas", codigo_aula: "A-101" } },
  { id_reserva: 2, id_aula: 1, id_usuario: 2, fecha_reserva: "2026-10-29", hora_inicio: "12:00", hora_fin: "14:00", motivo: "Física", estado: "Pendiente", usuarios: { nombre: "Muñoz", apellido: "Ebratt Ricardo Alberto" }, aulas: { nombre_aula: "Matemáticas", codigo_aula: "A-101" } },
  { id_reserva: 3, id_aula: 2, id_usuario: 2, fecha_reserva: "2026-10-29", hora_inicio: "09:00", hora_fin: "11:00", motivo: "Programación", estado: "Pendiente", usuarios: { nombre: "Martes", apellido: "Barrios Astrid" }, aulas: { nombre_aula: "Informática", codigo_aula: "A-102" } },
  { id_reserva: 4, id_aula: 3, id_usuario: 2, fecha_reserva: "2026-10-29", hora_inicio: "14:00", hora_fin: "16:00", motivo: "Robótica", estado: "Pendiente", usuarios: { nombre: "Niebles", apellido: "Cardenas Manuel Julian" }, aulas: { nombre_aula: "Innovación", codigo_aula: "A-103" } },
  { id_reserva: 5, id_aula: 4, id_usuario: 2, fecha_reserva: "2026-10-29", hora_inicio: "10:00", hora_fin: "12:00", motivo: "Diseño", estado: "Pendiente", usuarios: { nombre: "Cuentas", apellido: "Patiño Milagro De Jesus" }, aulas: { nombre_aula: "Punto Vive Digital", codigo_aula: "A-104" } },
  { id_reserva: 6, id_aula: 4, id_usuario: 2, fecha_reserva: "2026-10-29", hora_inicio: "13:00", hora_fin: "15:00", motivo: "Redes", estado: "Pendiente", usuarios: { nombre: "García", apellido: "Mercado Luis Ricardo" }, aulas: { nombre_aula: "Punto Vive Digital", codigo_aula: "A-104" } },
  { id_reserva: 7, id_aula: 4, id_usuario: 2, fecha_reserva: "2026-10-29", hora_inicio: "16:00", hora_fin: "18:00", motivo: "Comunicación", estado: "Pendiente", usuarios: { nombre: "Redondo", apellido: "Gutierrez Heidy Esther" }, aulas: { nombre_aula: "Punto Vive Digital", codigo_aula: "A-104" } },
];

const hourMarkers = ["07:00", "10:00", "12:00", "15:00", "18:00"];
const startOfDayMinutes = 7 * 60;
const endOfDayMinutes = 18 * 60;
const totalMinutes = endOfDayMinutes - startOfDayMinutes;

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const normalized = Math.max(0, Math.min(value, 23 * 60 + 59));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getReservationStyle(start: string, end: string) {
  const left = ((timeToMinutes(start) - startOfDayMinutes) / totalMinutes) * 100;
  const width = ((timeToMinutes(end) - timeToMinutes(start)) / totalMinutes) * 100;
  return {
    left: `${left}%`,
    width: `${Math.max(width, 12)}%`,
  };
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getTeacherNameFromReservation(reservation: ReservationItem) {
  const teacher = reservation.usuarios ? `${reservation.usuarios.nombre ?? ""} ${reservation.usuarios.apellido ?? ""}`.trim() : "Docente";
  return teacher || "Docente";
}

function buildFreeSlots(reservations: ReservationItem[] = []) {
  const occupied = reservations
    .map((reservation) => ({
      start: timeToMinutes(reservation.hora_inicio),
      end: timeToMinutes(reservation.hora_fin),
    }))
    .sort((a, b) => a.start - b.start);

  const free: Array<{ start: string; end: string }> = [];
  let current = startOfDayMinutes;

  for (const segment of occupied) {
    if (current < segment.start) {
      free.push({ start: minutesToTime(current), end: minutesToTime(segment.start) });
    }
    current = Math.max(current, segment.end);
  }

  if (current < endOfDayMinutes) {
    free.push({ start: minutesToTime(current), end: minutesToTime(endOfDayMinutes) });
  }

  return free.filter((slot) => timeToMinutes(slot.end) > timeToMinutes(slot.start));
}

export default function HorariosPage() {
  const [role, setRole] = useState("Profesor");
  const [selectedDate, setSelectedDate] = useState("");
  const [dateOptions, setDateOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [rooms, setRooms] = useState<RoomItem[]>(defaultRooms);
  const [reservations, setReservations] = useState<ReservationItem[]>(defaultReservations);
  const [draft, setDraft] = useState<DraftReservation | null>(null);
  const [contextReservation, setContextReservation] = useState<ReservationItem | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const storedRole = localStorage.getItem("session-role") ?? "Profesor";
    const today = new Date();
    const nextOptions = [0, 1, 2].map((offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      return {
        value: date.toISOString().slice(0, 10),
        label: offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : formatShortDate(date),
      };
    });

    setRole(storedRole);
    setDateOptions(nextOptions);
    setSelectedDate((current) => current || nextOptions[0]?.value || "");
  }, []);

  useEffect(() => {
    const loadTimelineData = async () => {
      try {
        if (!supabase) {
          setRooms(defaultRooms);
          setReservations(defaultReservations);
          return;
        }

        const [aulasResult, reservasResult] = await Promise.all([
          supabase.from("aulas").select("id_aula, nombre_aula, codigo_aula, estado").order("nombre_aula", { ascending: true }),
          supabase.from("reservas").select("*, usuarios(nombre, apellido, email), aulas(nombre_aula, codigo_aula)").order("fecha_reserva", { ascending: false }),
        ]);

        if (aulasResult.error) throw aulasResult.error;
        if (reservasResult.error) throw reservasResult.error;

        const nextRooms = (aulasResult.data ?? []).length
          ? (aulasResult.data ?? []).map((room) => ({
              id_aula: Number(room.id_aula),
              nombre_aula: room.nombre_aula ?? `Aula ${room.id_aula}`,
              codigo_aula: room.codigo_aula ?? `A-${room.id_aula}`,
              icon: ["📐", "💻", "💡", "📡", "🧪"][Number(room.id_aula) % 5],
              estado: room.estado ?? "Activo",
            }))
          : defaultRooms;

        const nextReservations = (reservasResult.data ?? []).map((reservation) => ({
          id_reserva: Number(reservation.id_reserva),
          id_aula: Number(reservation.id_aula),
          id_usuario: Number(reservation.id_usuario),
          fecha_reserva: reservation.fecha_reserva,
          hora_inicio: reservation.hora_inicio ?? "09:00",
          hora_fin: reservation.hora_fin ?? "11:00",
          motivo: reservation.motivo ?? "Reserva de aula",
          estado: reservation.estado ?? "Pendiente",
          usuarios: reservation.usuarios ?? null,
          aulas: reservation.aulas ?? null,
        })) as ReservationItem[];

        setRooms(nextRooms);
        setReservations(nextReservations.length ? nextReservations : defaultReservations);
      } catch (error) {
        console.warn("No se pudo cargar la línea de tiempo real; se conserva el fallback visual.", error);
        setRooms(defaultRooms);
        setReservations(defaultReservations);
      }
    };

    void loadTimelineData();
  }, [role]);

  const isAdmin = role === "Superadministrador";
  const activeDate = selectedDate || dateOptions[0]?.value || "";

  const visibleReservations = useMemo(
    () => reservations.filter((reservation) => reservation.fecha_reserva === activeDate),
    [reservations, activeDate],
  );

  const handleFreeSlotClick = (room: RoomItem, start: string, end: string) => {
    const sessionName = localStorage.getItem("session-name") || "Profesor asignado";

    setDraft({
      roomId: room.id_aula,
      roomName: room.nombre_aula,
      date: activeDate,
      start,
      end,
      teacher: sessionName,
      subject: "Clase / práctica / reunión",
    });
    setContextReservation(null);
    setNotice("");
  };

  const handleOccupiedSlotClick = (reservation: ReservationItem) => {
    if (!isAdmin) return;
    setContextReservation(reservation);
    setDraft(null);
  };

  const applyAdminAction = async (action: "cancelar" | "liberar" | "editar") => {
    if (!contextReservation) return;

    if (action === "editar") {
      setDraft({
        id_reserva: contextReservation.id_reserva,
        roomId: contextReservation.id_aula,
        roomName: contextReservation.aulas?.nombre_aula ?? "Aula",
        date: contextReservation.fecha_reserva,
        start: contextReservation.hora_inicio,
        end: contextReservation.hora_fin,
        teacher: getTeacherNameFromReservation(contextReservation),
        subject: contextReservation.motivo ?? "Reserva / sesión",
      });
      setContextReservation(null);
      return;
    }

    try {
      if (supabase) {
        const { error } = await supabase.from("reservas").delete().eq("id_reserva", contextReservation.id_reserva);
        if (error) throw error;
      } else {
        setReservations((current) => current.filter((item) => item.id_reserva !== contextReservation.id_reserva));
      }

      setNotice(
        action === "cancelar"
          ? `Reserva cancelada para ${getTeacherNameFromReservation(contextReservation)}`
          : `Aula liberada para ${contextReservation.aulas?.nombre_aula ?? "la reserva"}`,
      );
    } catch (error) {
      setNotice("No se pudo actualizar la reserva. Revisa la conexión con Supabase.");
      console.warn("Error al aplicar acción del admin:", error);
    } finally {
      setContextReservation(null);
    }
  };

  const confirmDirectReservation = async () => {
    if (!draft) return;

    const sessionUserId = Number(localStorage.getItem("session-user-id") ?? 2);
    const insertPayload = {
      id_usuario: sessionUserId,
      id_aula: draft.roomId,
      fecha_reserva: draft.date,
      hora_inicio: draft.start,
      hora_fin: draft.end,
      motivo: draft.subject.trim() || "Reserva de aula",
      estado: "Pendiente",
    };

    try {
      if (supabase) {
        if (draft.id_reserva) {
          const { error } = await supabase.from("reservas").update({
            id_aula: draft.roomId,
            fecha_reserva: draft.date,
            hora_inicio: draft.start,
            hora_fin: draft.end,
            motivo: insertPayload.motivo,
          }).eq("id_reserva", draft.id_reserva);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("reservas").insert(insertPayload);
          if (error) throw error;
        }
      } else {
        const nextReservation: ReservationItem = {
          id_reserva: draft.id_reserva ?? Date.now(),
          id_aula: draft.roomId,
          id_usuario: sessionUserId,
          fecha_reserva: draft.date,
          hora_inicio: draft.start,
          hora_fin: draft.end,
          motivo: insertPayload.motivo,
          estado: "Pendiente",
          usuarios: { nombre: draft.teacher.split(" ")[0] ?? "Profesor", apellido: draft.teacher.replace(draft.teacher.split(" ")[0] ?? "", "").trim() || "Asignado" },
          aulas: { nombre_aula: draft.roomName, codigo_aula: draft.roomName },
        };

        setReservations((current) => {
          if (draft.id_reserva) {
            return current.map((item) => item.id_reserva === draft.id_reserva ? nextReservation : item);
          }
          return [nextReservation, ...current];
        });
      }

      setNotice(`Reserva ${draft.id_reserva ? "actualizada" : "creada"} para ${draft.roomName} · ${draft.start} a ${draft.end}`);
      setDraft(null);
    } catch (error) {
      setNotice("No se pudo guardar la reserva. Revisa la conexión y permisos del proyecto.");
      console.warn("Error de reserva rápida:", error);
    }
  };

  return (
    <main className="page-shell">
      <RoleSidebar />

      <section className="content-panel timeline-viewport">
        <div className="timeline-breadcrumb">
          <span className="breadcrumb-leaf">ADMINISTRACIÓN</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Horarios</span>
        </div>

        <header className="timeline-header">
          <div className="timeline-heading-block">
            <h1>Línea de tiempo</h1>
            <p>DISPONIBILIDAD POR AULA</p>
          </div>

          <div className="timeline-filters">
            {dateOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={activeDate === option.value ? "filter-pill active" : "filter-pill"}
                onClick={() => setSelectedDate(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        <div className="timeline-chips-row">
          {hourMarkers.map((marker) => (
            <span key={marker}>{marker}</span>
          ))}
        </div>

        <div className="timeline-board">
          {rooms.map((room) => {
            const roomReservations = visibleReservations.filter((item) => Number(item.id_aula) === Number(room.id_aula));
            const freeSlots = buildFreeSlots(roomReservations);

            return (
              <div key={room.id_aula} className="timeline-row">
                <div className="timeline-room-label">
                  <span className="room-title">AULA ESPECIALIZADA</span>
                  <strong>{room.nombre_aula}</strong>
                  <small>{room.codigo_aula}</small>
                  <span className="room-icon">{room.icon}</span>
                </div>

                <div className="timeline-track" aria-label={`Disponibilidad de ${room.nombre_aula}`}>
                  {hourMarkers.map((marker) => (
                    <span
                      key={`${room.id_aula}-${marker}`}
                      className="time-marker"
                      style={{ left: `${((timeToMinutes(marker) - startOfDayMinutes) / totalMinutes) * 100}%` }}
                    />
                  ))}

                  {roomReservations.map((reservation) => {
                    const style = getReservationStyle(reservation.hora_inicio, reservation.hora_fin);
                    const teacher = getTeacherNameFromReservation(reservation);

                    return (
                      <button
                        key={reservation.id_reserva}
                        type="button"
                        className="timeline-reservation-pill"
                        style={{
                          ...style,
                          background: reservation.estado === "Pendiente" ? "#dfeef1" : reservation.estado === "Aprobada" ? "#d7f0d2" : "#f5d8d8",
                        }}
                        onClick={() => handleOccupiedSlotClick(reservation)}
                        title={`${teacher} · ${reservation.hora_inicio} - ${reservation.hora_fin}`}
                      >
                        <span>{teacher.toUpperCase()}</span>
                        <small>{reservation.hora_inicio} - {reservation.hora_fin}</small>
                      </button>
                    );
                  })}

                  {freeSlots.map((slot) => {
                    const left = ((timeToMinutes(slot.start) - startOfDayMinutes) / totalMinutes) * 100;
                    const width = ((timeToMinutes(slot.end) - timeToMinutes(slot.start)) / totalMinutes) * 100;

                    return (
                      <button
                        key={`${room.id_aula}-${slot.start}-${slot.end}`}
                        type="button"
                        className="timeline-free-slot"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                        }}
                        onClick={() => handleFreeSlotClick(room, slot.start, slot.end)}
                        aria-label={`Reservar ${room.nombre_aula} entre ${slot.start} y ${slot.end}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {notice ? (
          <div className="timeline-notice" role="status">
            {notice}
          </div>
        ) : null}
      </section>

      {draft ? (
        <div className="timeline-modal-backdrop" onClick={() => setDraft(null)}>
          <div className="timeline-modal" onClick={(event) => event.stopPropagation()}>
            <div className="timeline-modal-header">
              <div>
                <p>Reserva rápida</p>
                <h3>{draft.roomName}</h3>
              </div>
              <button type="button" className="timeline-close" onClick={() => setDraft(null)}>
                ×
              </button>
            </div>

            <div className="timeline-summary-grid">
              <div>
                <span>Fecha</span>
                <strong>{draft.date}</strong>
              </div>
              <div>
                <span>Bloque</span>
                <strong>{draft.start} - {draft.end}</strong>
              </div>
            </div>

            <label className="timeline-form-field">
              Docente
              <input
                value={draft.teacher}
                onChange={(event) => setDraft((current) => (current ? { ...current, teacher: event.target.value } : current))}
              />
            </label>

            <label className="timeline-form-field">
              Materia / motivo
              <textarea
                rows={3}
                value={draft.subject}
                onChange={(event) => setDraft((current) => (current ? { ...current, subject: event.target.value } : current))}
              />
            </label>

            <div className="timeline-modal-actions">
              <button type="button" className="secondary-button" onClick={() => setDraft(null)}>
                Cancelar
              </button>
              <button type="button" className="primary-button" onClick={() => void confirmDirectReservation()}>
                {isAdmin ? "Forzar reserva" : "Confirmar reserva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {contextReservation && isAdmin ? (
        <div className="timeline-context-menu" role="menu" aria-label="Acciones rápidas del administrador">
          <button type="button" onClick={() => void applyAdminAction("cancelar")}>Cancelar Reserva</button>
          <button type="button" onClick={() => void applyAdminAction("liberar")}>Liberar Aula</button>
          <button type="button" onClick={() => void applyAdminAction("editar")}>Editar Asignación</button>
        </div>
      ) : null}
    </main>
  );
}
