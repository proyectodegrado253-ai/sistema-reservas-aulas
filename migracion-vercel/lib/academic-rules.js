/**
 * @typedef {{
 *   id_reserva?: number;
 *   id_usuario?: number | null;
 *   id_aula?: number | null;
 *   fecha_reserva?: string;
 *   hora_inicio?: string;
 *   hora_fin?: string;
 *   estado?: string;
 * }} ReservaAcademica
 */

/**
 * @typedef {{
 *   reservations?: ReservaAcademica[];
 *   selectedUserId?: number | null;
 *   selectedAulaId?: number | null;
 *   fecha?: string;
 *   horaInicio?: string;
 *   horaFin?: string;
 *   currentReservationId?: number | null;
 * }} ReservationValidationOptions
 */

/**
 * @typedef {{
 *   action?: string;
 *   summary?: string;
 *   userName?: string;
 *   userId?: number | null;
 *   state?: string;
 *   role?: string;
 *   date?: string;
 * }} AuditEntryOptions
 */

export function getMinutes(value) {
  if (!value || typeof value !== 'string') {
    return 0;
  }

  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return hours * 60 + minutes;
}

export function overlaps(startA, endA, startB, endB) {
  return getMinutes(startA) < getMinutes(endB) && getMinutes(endA) > getMinutes(startB);
}

export function buildHourSlots({ startHour = 6, endHour = 22, stepMinutes = 60 } = {}) {
  const slots = [];

  for (let hour = startHour; hour < endHour; hour += stepMinutes / 60) {
    const start = `${String(hour).padStart(2, '0')}:00`;
    const nextHour = hour + stepMinutes / 60;
    const end = `${String(nextHour).padStart(2, '0')}:00`;
    slots.push({ start, end, label: `${start} - ${end}` });
  }

  return slots;
}

export function isRangeOccupiedByReservation({ reservation, start, end }) {
  if (!reservation || !start || !end) {
    return false;
  }

  return overlaps(start, end, reservation.hora_inicio, reservation.hora_fin);
}

/**
 * @param {ReservationValidationOptions} options
 * @returns {{ valid: boolean, message: string }}
 */
export function validateAcademicReservation({
  reservations = [],
  selectedUserId = null,
  selectedAulaId = null,
  fecha = "",
  horaInicio = "",
  horaFin = "",
  currentReservationId = null,
} = {}) {
  if (!fecha) {
    return { valid: false, message: 'Debes seleccionar la fecha de la reserva.' };
  }

  if (!horaInicio || !horaFin) {
    return { valid: false, message: 'Debes indicar la hora de inicio y fin.' };
  }

  const startMinutes = getMinutes(horaInicio);
  const endMinutes = getMinutes(horaFin);

  if (startMinutes <= 0 || endMinutes <= 0 || endMinutes <= startMinutes) {
    return { valid: false, message: 'La hora final debe ser posterior a la hora de inicio.' };
  }

  if (!selectedUserId || !selectedAulaId) {
    return { valid: false, message: 'Debes seleccionar docente y aula antes de guardar.' };
  }

  const filteredReservations = (reservations ?? []).filter((reservation) => {
    const sameDate = String(reservation.fecha_reserva) === String(fecha);
    const sameDocente = Number(reservation.id_usuario) === Number(selectedUserId);
    const sameAula = Number(reservation.id_aula) === Number(selectedAulaId);
    const notCurrent = Number(reservation.id_reserva) !== Number(currentReservationId);
    return notCurrent && sameDate && (sameDocente || sameAula);
  });

  const docenteConflict = filteredReservations.some((reservation) => {
    const sameDocente = Number(reservation.id_usuario) === Number(selectedUserId);
    return sameDocente && overlaps(horaInicio, horaFin, reservation.hora_inicio, reservation.hora_fin);
  });

  if (docenteConflict) {
    return {
      valid: false,
      message: 'El docente ya tiene otra reserva en ese mismo horario. Ajusta la agenda académica.',
    };
  }

  const aulaConflict = filteredReservations.some((reservation) => {
    const sameAula = Number(reservation.id_aula) === Number(selectedAulaId);
    return sameAula && overlaps(horaInicio, horaFin, reservation.hora_inicio, reservation.hora_fin);
  });

  if (aulaConflict) {
    return {
      valid: false,
      message: 'El aula ya está ocupada en ese horario. Elige otra franja o aula.',
    };
  }

  return { valid: true, message: 'Reserva válida para la programación académica.' };
}

/**
 * @param {AuditEntryOptions} options
 * @returns {Array<Record<string, any>>}
 */
export function appendAuditEntry({
  action = 'Actualización del sistema',
  summary = '',
  userName = 'Sistema',
  userId = null,
  state = 'Pendiente',
  role = 'Profesor',
  date = new Date().toISOString(),
} = {}) {
  const existing = JSON.parse(localStorage.getItem('cache-auditoria') ?? '[]');
  const nextEntry = {
    id: Date.now(),
    action,
    summary,
    userName: userName || 'Sistema',
    userId: userId ?? null,
    state: state ?? 'Pendiente',
    role: role ?? 'Profesor',
    timestamp: date ?? new Date().toISOString(),
  };

  const updated = [nextEntry, ...existing].slice(0, 10);
  localStorage.setItem('cache-auditoria', JSON.stringify(updated));
  return updated;
}
