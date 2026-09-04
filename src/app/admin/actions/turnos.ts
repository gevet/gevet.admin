'use server'

import { z } from 'zod'
import { crearTurno, listarTurnosPorFecha, actualizarEstadoTurno, getDbContext } from '@/lib/db'
import type { Turno } from '@/lib/types/database'

/**
 * Zod schemas for appointment validation
 */
const turnoCreateSchema = z.object({
  cliente_id: z.string().uuid('Cliente ID inválido'),
  mascota_id: z.string().uuid('Mascota ID inválido'),
  profesional_id: z.string().uuid('Profesional ID inválido').optional().nullable(),
  fecha_hora: z.string().datetime('Fecha y hora inválida'),
  duracion_minutos: z.number().int().min(15).max(480).default(30),
  motivo: z.string().min(3, 'Motivo debe tener al menos 3 caracteres'),
  notas: z.string().optional().nullable(),
})

const turnoUpdateEstadoSchema = z.object({
  estado: z.enum(['Pendiente', 'Confirmado', 'En Progreso', 'Completado', 'Cancelado', 'No-Show']),
  razon_cancelacion: z.string().optional().nullable(),
})

/**
 * Create a new appointment
 */
export async function crearTurnoAction(input: unknown): Promise<{ error?: string; data?: Turno }> {
  const parsed = turnoCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    const turno = await crearTurno(parsed.data)
    if (!turno) {
      return { error: 'No pudimos crear el turno' }
    }

    return { data: turno }
  } catch (error) {
    console.error('Error creating turno:', error)
    return { error: 'Error al crear el turno' }
  }
}

/**
 * List appointments for a given date
 */
export async function listarTurnosFechaAction(fecha: string): Promise<{ error?: string; data?: Turno[] }> {
  if (!fecha) {
    return { error: 'Fecha requerida' }
  }

  try {
    // Validate date format
    const dateObj = new Date(fecha)
    if (isNaN(dateObj.getTime())) {
      return { error: 'Fecha inválida' }
    }

    const turnos = await listarTurnosPorFecha(fecha)
    return { data: turnos }
  } catch (error) {
    console.error('Error listing turnos:', error)
    return { error: 'Error al listar turnos' }
  }
}

/**
 * Update appointment status
 */
export async function actualizarEstadoTurnoAction(
  turnoId: string,
  input: unknown
): Promise<{ error?: string; data?: Turno }> {
  if (!turnoId) {
    return { error: 'ID de turno requerido' }
  }

  const parsed = turnoUpdateEstadoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    const turno = await actualizarEstadoTurno(
      turnoId,
      parsed.data.estado,
      parsed.data.razon_cancelacion ?? undefined
    )

    if (!turno) {
      return { error: 'No pudimos actualizar el turno' }
    }

    return { data: turno }
  } catch (error) {
    console.error('Error updating turno:', error)
    return { error: 'Error al actualizar el turno' }
  }
}

/**
 * Cancel an appointment
 */
export async function cancelarTurnoAction(
  turnoId: string,
  razon: string
): Promise<{ error?: string; success?: boolean }> {
  if (!turnoId) {
    return { error: 'ID de turno requerido' }
  }

  if (!razon || razon.length < 3) {
    return { error: 'Razón de cancelación requerida' }
  }

  try {
    const turno = await actualizarEstadoTurno(turnoId, 'Cancelado', razon)
    if (!turno) {
      return { error: 'No pudimos cancelar el turno' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error canceling turno:', error)
    return { error: 'Error al cancelar el turno' }
  }
}
