'use server'

import { z } from 'zod'
import { crearConsulta, obtenerConsulta, listarConsultasPorMascota, getDbContext } from '@/lib/db'
import type { Consulta } from '@/lib/types/database'

/**
 * Zod schemas for consultation validation
 * SOAP format: Subjective, Objective, Assessment, Plan
 */
const consultaCreateSchema = z.object({
  turno_id: z.string().uuid('Turno ID inválido'),
  cliente_id: z.string().uuid('Cliente ID inválido'),
  mascota_id: z.string().uuid('Mascota ID inválido'),
  subjetivo: z.string().optional().nullable(),
  objetivo: z.string().optional().nullable(),
  evaluacion: z.string().min(10, 'Evaluación debe tener al menos 10 caracteres'),
  plan: z.string().min(10, 'Plan debe tener al menos 10 caracteres'),
  temperatura_celsius: z.number().min(35).max(42).optional().nullable(),
  frecuencia_cardiaca_bpm: z.number().int().min(20).max(300).optional().nullable(),
  frecuencia_respiratoria_rpm: z.number().int().min(5).max(100).optional().nullable(),
  peso_kg: z.number().positive().max(200).optional().nullable(),
  diagnostico: z.string().optional().nullable(),
  prescripciones: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  referencia_a_especialista: z.string().optional().nullable(),
})

/**
 * Create a new consultation (medical record)
 * Typically done after appointment completion
 */
export async function crearConsultaAction(input: unknown): Promise<{ error?: string; data?: Consulta }> {
  const parsed = consultaCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    // Verify user is a veterinarian (has permission to create consultations)
    // TODO: Add permission check when permission system is implemented

    const consulta = await crearConsulta(parsed.data)
    if (!consulta) {
      return { error: 'No pudimos crear la consulta' }
    }

    return { data: consulta }
  } catch (error) {
    console.error('Error creating consulta:', error)
    return { error: 'Error al crear la consulta' }
  }
}

/**
 * Get a single consultation by ID
 */
export async function obtenerConsultaAction(consultaId: string): Promise<{ error?: string; data?: Consulta }> {
  if (!consultaId) {
    return { error: 'ID de consulta requerido' }
  }

  try {
    const consulta = await obtenerConsulta(consultaId)
    if (!consulta) {
      return { error: 'Consulta no encontrada' }
    }

    return { data: consulta }
  } catch (error) {
    console.error('Error fetching consulta:', error)
    return { error: 'Error al obtener la consulta' }
  }
}

/**
 * List all consultations for a pet
 */
export async function listarConsultasMascotaAction(mascotaId: string): Promise<{ error?: string; data?: Consulta[] }> {
  if (!mascotaId) {
    return { error: 'ID de mascota requerido' }
  }

  try {
    const consultas = await listarConsultasPorMascota(mascotaId)
    return { data: consultas }
  } catch (error) {
    console.error('Error listing consultas:', error)
    return { error: 'Error al listar consultas' }
  }
}

/**
 * List all consultations for the current tenant
 */
export async function listarConsultasAction(): Promise<{ error?: string; data?: Consulta[] }> {
  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    // TODO: Implement database query to list all consultations
    // For now, return empty array as placeholder
    return { data: [] }
  } catch (error) {
    console.error('Error listing consultas:', error)
    return { error: 'Error al listar consultas' }
  }
}

/**
 * Generate a medical prescription as PDF
 * (To be implemented with jsPDF)
 */
export async function generarRecetaPdfAction(consultaId: string): Promise<{ error?: string; url?: string }> {
  if (!consultaId) {
    return { error: 'ID de consulta requerido' }
  }

  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    const consulta = await obtenerConsulta(consultaId)
    if (!consulta) {
      return { error: 'Consulta no encontrada' }
    }

    // TODO: Implement PDF generation with jsPDF
    // For now, return placeholder
    return {
      error: 'PDF generation not yet implemented',
    }
  } catch (error) {
    console.error('Error generating prescription PDF:', error)
    return { error: 'Error al generar receta' }
  }
}
