import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHourSlots, isRangeOccupiedByReservation, validateAcademicReservation } from './academic-rules.js';

test('genera franjas horarias de 1 hora', () => {
  const slots = buildHourSlots({ startHour: 6, endHour: 10, stepMinutes: 60 });

  assert.equal(slots.length, 4);
  assert.deepEqual(slots[0], { start: '06:00', end: '07:00', label: '06:00 - 07:00' });
  assert.deepEqual(slots[3], { start: '09:00', end: '10:00', label: '09:00 - 10:00' });
});

test('marca como ocupado si solapa con una reserva existente', () => {
  const reservation = { hora_inicio: '09:00', hora_fin: '11:00' };

  assert.equal(isRangeOccupiedByReservation({ reservation, start: '09:30', end: '10:00' }), true);
  assert.equal(isRangeOccupiedByReservation({ reservation, start: '11:00', end: '12:00' }), false);
});

test('detecta conflicto por docente', () => {
  const result = validateAcademicReservation({
    reservations: [
      { id_reserva: 1, id_usuario: 7, id_aula: 3, fecha_reserva: '2026-10-14', hora_inicio: '09:00', hora_fin: '11:00', estado: 'Aprobada' },
    ],
    selectedUserId: 7,
    selectedAulaId: 5,
    fecha: '2026-10-14',
    horaInicio: '10:30',
    horaFin: '12:00',
  });

  assert.equal(result.valid, false);
  assert.match(result.message, /docente|horario/i);
});

test('detecta conflicto por aula', () => {
  const result = validateAcademicReservation({
    reservations: [
      { id_reserva: 2, id_usuario: 9, id_aula: 11, fecha_reserva: '2026-10-14', hora_inicio: '13:00', hora_fin: '15:00', estado: 'Pendiente' },
    ],
    selectedUserId: 6,
    selectedAulaId: 11,
    fecha: '2026-10-14',
    horaInicio: '14:00',
    horaFin: '16:00',
  });

  assert.equal(result.valid, false);
  assert.match(result.message, /aula|ocupada|horario/i);
});

test('acepta reservas no solapadas', () => {
  const result = validateAcademicReservation({
    reservations: [
      { id_reserva: 3, id_usuario: 4, id_aula: 2, fecha_reserva: '2026-10-15', hora_inicio: '08:00', hora_fin: '10:00', estado: 'Aprobada' },
    ],
    selectedUserId: 5,
    selectedAulaId: 3,
    fecha: '2026-10-15',
    horaInicio: '10:30',
    horaFin: '12:00',
  });

  assert.equal(result.valid, true);
});
