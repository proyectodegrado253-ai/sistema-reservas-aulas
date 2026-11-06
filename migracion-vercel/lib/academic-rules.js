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
 *   exceptionalDates?: string[];
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

export const SCHOOL_RESERVATION_WINDOW = {
  start: '06:00',
  end: '18:00',
  allowedWeekdays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
};

export function getInstitutionalConfig() {
  const defaultConfig = {
    startHour: SCHOOL_RESERVATION_WINDOW.start,
    endHour: SCHOOL_RESERVATION_WINDOW.end,
    weekdays: [...SCHOOL_RESERVATION_WINDOW.allowedWeekdays],
    requireApproval: true,
  };

  if (typeof window === 'undefined') {
    return defaultConfig;
  }

  try {
    const rawConfig = localStorage.getItem('config-reservas');
    if (!rawConfig) {
      return defaultConfig;
    }

    const parsedConfig = JSON.parse(rawConfig);
    return {
      ...defaultConfig,
      ...parsedConfig,
      weekdays: Array.isArray(parsedConfig?.weekdays) && parsedConfig.weekdays.length
        ? parsedConfig.weekdays
        : defaultConfig.weekdays,
    };
  } catch (error) {
    console.warn('No se pudo leer la configuración institucional.', error);
    return defaultConfig;
  }
}

export function saveInstitutionalConfig(config = {}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const normalizedConfig = {
    startHour: config.startHour ?? SCHOOL_RESERVATION_WINDOW.start,
    endHour: config.endHour ?? SCHOOL_RESERVATION_WINDOW.end,
    weekdays: Array.isArray(config.weekdays) && config.weekdays.length ? config.weekdays : SCHOOL_RESERVATION_WINDOW.allowedWeekdays,
    requireApproval: config.requireApproval ?? true,
  };

  localStorage.setItem('config-reservas', JSON.stringify(normalizedConfig));
  return normalizedConfig;
}

export function getExceptionalDates() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawDates = localStorage.getItem('excepciones-reservas');
    if (!rawDates) {
      return [];
    }

    const parsedDates = JSON.parse(rawDates);
    return Array.isArray(parsedDates)
      ? parsedDates.map((date) => String(date).slice(0, 10)).filter(Boolean)
      : [];
  } catch (error) {
    console.warn('No se pudieron leer las fechas extraordinarias.', error);
    return [];
  }
}

export function saveExceptionalDates(dates = []) {
  if (typeof window === 'undefined') {
    return [];
  }

  const normalizedDates = [...new Set((dates ?? []).map((date) => String(date).slice(0, 10)).filter(Boolean))];
  localStorage.setItem('excepciones-reservas', JSON.stringify(normalizedDates));
  return normalizedDates;
}

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

export function getDateDayName(dateValue) {
  if (!dateValue) {
    return null;
  }

  const normalized = typeof dateValue === 'string' && dateValue.includes('T') ? dateValue : `${dateValue}T12:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dayNames[parsed.getDay()];
}

export function isSchoolDayAllowed(dateValue, exceptionalDates = []) {
  const dayName = getDateDayName(dateValue);
  if (!dayName) {
    return false;
  }

  if (SCHOOL_RESERVATION_WINDOW.allowedWeekdays.includes(dayName)) {
    return true;
  }

  const normalizedDate = String(dateValue).slice(0, 10);
  return exceptionalDates.some((date) => String(date).slice(0, 10) === normalizedDate);
}

export function isReservationWindowAllowed({ date = '', horaInicio = '', horaFin = '', exceptionalDates = [] } = {}) {
  if (!date || !horaInicio || !horaFin) {
    return false;
  }

  const startMinutes = getMinutes(horaInicio);
  const endMinutes = getMinutes(horaFin);
  const startLimit = getMinutes(SCHOOL_RESERVATION_WINDOW.start);
  const endLimit = getMinutes(SCHOOL_RESERVATION_WINDOW.end);

  if (startMinutes < startLimit || endMinutes > endLimit || endMinutes <= startMinutes) {
    return false;
  }

  if (!isSchoolDayAllowed(date, exceptionalDates)) {
    return false;
  }

  return true;
}

export function overlaps(startA, endA, startB, endB) {
  return getMinutes(startA) < getMinutes(endB) && getMinutes(endA) > getMinutes(startB);
}

export function buildHourSlots({ startHour = 6, endHour = 18, stepMinutes = 60 } = {}) {
  const slots = [];

  for (let hour = startHour; hour < endHour; hour += stepMinutes / 60) {
    const start = `${String(hour).padStart(2, '0')}:00`;
    const nextHour = hour + stepMinutes / 60;
    const end = `${String(nextHour).padStart(2, '0')}:00`;

    if (getMinutes(end) > endHour * 60) {
      break;
    }

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
  fecha = '',
  horaInicio = '',
  horaFin = '',
  currentReservationId = null,
  exceptionalDates = [],
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

  if (!isReservationWindowAllowed({ date: fecha, horaInicio, horaFin, exceptionalDates })) {
    const dayName = getDateDayName(fecha);
    const hasException = exceptionalDates.some((date) => String(date).slice(0, 10) === String(fecha).slice(0, 10));

    if (!dayName || !SCHOOL_RESERVATION_WINDOW.allowedWeekdays.includes(dayName) && !hasException) {
      return {
        valid: false,
        message: 'Las reservas ordinarias solo se permiten de lunes a viernes. Los sábados, domingos y horarios fuera del rango 06:00 a 18:00 requieren autorización administrativa.',
      };
    }

    return {
      valid: false,
      message: 'La reserva debe quedar dentro del horario institucional autorizado: de 06:00 a 18:00.',
    };
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
