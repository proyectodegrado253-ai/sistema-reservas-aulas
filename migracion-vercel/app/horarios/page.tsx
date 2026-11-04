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
    .filter((segment) => segment.end > segment.start)
    .sort((a, b) => a.start - b.start);

  const normalizedSegments: Array<{ start: number; end: number }> = [];

  for (const segment of occupied) {
    const last = normalizedSegments[normalizedSegments.length - 1];
    if (!last) {
      normalizedSegments.push({ ...segment });
      continue;
    }

    if (segment.start <= last.end) {
      last.end = Math.max(last.end, segment.end);
      continue;
    }

    normalizedSegments.push({ ...segment });
  }

  const free: Array<{ start: string; end: string }> = [];
  let current = startOfDayMinutes;

  for (const segment of normalizedSegments) {
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
          supabase.from("reservas").select("*, usuarios!fk_reservas_usuarios(nombre, apellido, email), aulas!fk_reservas_aulas(nombre_aula, codigo_aula)").order("fecha_reserva", { ascending: false }),
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

  const scheduleInsights = useMemo(() => {
    const data = rooms.map((room) => {
      const roomReservations = visibleReservations.filter((item) => Number(item.id_aula) === Number(room.id_aula));
      const freeSlots = buildFreeSlots(roomReservations);
      return {
        room: room.nombre_aula,
        freeSlots: freeSlots.length,
        occupied: roomReservations.length,
      };
    });

    const availableRooms = data.filter((item) => item.freeSlots > 0).length;
    const nextClass = [...visibleReservations].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))[0];
    const mostUsed = data.reduce((best, current) => (current.occupied > best.occupied ? current : best), { room: "Sin datos", freeSlots: 0, occupied: 0 });

    return {
      availableRooms,
      totalReservations: visibleReservations.length,
      nextClassLabel: nextClass ? `${nextClass.aulas?.nombre_aula ?? "Aula"} · ${nextClass.hora_inicio} - ${nextClass.hora_fin}` : "Sin clases programadas",
      mostUsedRoom: mostUsed.room,
      totalRooms: rooms.length,
    };
  }, [rooms, visibleReservations]);

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

  const utilizationByRoom = useMemo(() => {
    return rooms.map((room) => {
      const roomReservations = visibleReservations.filter((item) => Number(item.id_aula) === Number(room.id_aula));
      const usage = Math.min(100, Math.max(0, (roomReservations.length / Math.max(1, rooms.length)) * 100));

      return {
        room: room.nombre_aula,
        criteria: roomReservations.length,
        usage,
      };
    });
  }, [rooms, visibleReservations]);

  const timeBlocks = useMemo(() => {
    const periods = [
      { label: "07:00", value: 0 },
      { label: "09:00", value: 0 },
      { label: "11:00", value: 0 },
      { label: "13:00", value: 0 },
      { label: "15:00", value: 0 },
      { label: "17:00", value: 0 },
    ];

    for (const reservation of visibleReservations) {
      const hour = Number(reservation.hora_inicio.split(":")[0]);
      const bucket = periods.findIndex((period) => hour <= Number(period.label.split(":")[0]));
      if (bucket >= 0) {
        periods[Math.max(bucket, 0)].value += 1;
      }
    }

    return periods;
  }, [visibleReservations]);

  return (
    <main className="page-shell">
      <RoleSidebar />

      <section className="content-panel timeline-viewport">
        <div className="timeline-breadcrumb">
          <span className="breadcrumb-leaf">ADMINISTRACIÓN</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Estadísticas</span>
        </div>

        <header className="timeline-header">
          <div className="timeline-heading-block">
            <h1>Estadísticas</h1>
            <p>INDICADORES DEL PROFESOR</p>
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

        <div className="schedule-insights">
          <div className="schedule-insight-card">
            <span className="schedule-insight-label">Aulas libres</span>
            <strong className="schedule-insight-value">{scheduleInsights.availableRooms}/{scheduleInsights.totalRooms}</strong>
          </div>
          <div className="schedule-insight-card">
            <span className="schedule-insight-label">Reservas del día</span>
            <strong className="schedule-insight-value">{scheduleInsights.totalReservations}</strong>
          </div>
          <div className="schedule-insight-card">
            <span className="schedule-insight-label">Próxima clase</span>
            <strong className="schedule-insight-value compact-value">{scheduleInsights.nextClassLabel}</strong>
          </div>
          <div className="schedule-insight-card">
            <span className="schedule-insight-label">Más usada</span>
            <strong className="schedule-insight-value">{scheduleInsights.mostUsedRoom}</strong>
          </div>
        </div>

        <div className="stats-graph-grid">
          <div className="stats-panel">
            <div className="stats-panel-header">
              <h3>Uso por aula</h3>
              <span>{rooms.length} salas</span>
            </div>
            <div className="bar-chart">
              {utilizationByRoom.map((item) => (
                <div key={item.room} className="bar-row">
                  <span className="bar-label">{item.room}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${item.usage}%` }} />
                  </div>
                  <strong>{Math.round(item.usage)}%</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="stats-panel">
            <div className="stats-panel-header">
              <h3>Picos de uso</h3>
              <span>Bloques</span>
            </div>
            <div className="mini-bars">
              {timeBlocks.map((block) => (
                <div key={block.label} className="mini-bar-group">
                  <span className="mini-bar-value">{block.value}</span>
                  <div className="mini-bar-track">
                    <div className="mini-bar-fill" style={{ height: `${Math.max(12, block.value * 28)}%` }} />
                  </div>
                  <small>{block.label}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="stats-panel full-width">
            <div className="stats-panel-header">
              <h3>Disponibilidad general</h3>
              <span>Hoy</span>
            </div>
            <div className="donut-wrap">
              <div className="donut-chart" style={{ background: `conic-gradient(#1d4ed8 0 ${scheduleInsights.availableRooms * 100 / Math.max(1, scheduleInsights.totalRooms)}%, #e2e8f0 ${scheduleInsights.availableRooms * 100 / Math.max(1, scheduleInsights.totalRooms)}% 100%)` }}>
                <div className="donut-center">
                  <strong>{scheduleInsights.availableRooms}</strong>
                  <span>libres</span>
                </div>
              </div>
              <div className="legend-stack">
                <div className="legend-item"><span className="legend-dot blue" /> Libres</div>
                <div className="legend-item"><span className="legend-dot gray" /> Ocupadas</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
