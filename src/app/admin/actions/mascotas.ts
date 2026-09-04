'use server'

import { z } from 'zod'
import { crearMascota, obtenerMascota, listarMascotasPorCliente, getDbContext } from '@/lib/db'
import type { Mascota } from '@/lib/types/database'

/**
 * Zod schemas for pet validation
 */
const mascotaCreateSchema = z.object({
  cliente_id: z.string().uuid('Cliente ID inválido'),
  nombre: z.string().min(1, 'Nombre de mascota requerido'),
  especie: z.enum(['Perro', 'Gato', 'Conejo', 'Roedor', 'Ave', 'Reptil', 'Otro']),
  raza: z.string().optional().nullable(),
  sexo: z.enum(['Macho', 'Hembra', 'Desconocido']).optional().nullable(),
  color: z.string().optional().nullable(),
  peso_kg: z.number().positive().max(200).optional().nullable(),
  fecha_nacimiento: z.string().datetime().optional().nullable(),
  alergias: z.string().optional().nullable(),
  condiciones_cronicas: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
})

/**
 * Create a new pet for a client
 */
export async function crearMascotaAction(input: unknown): Promise<{ error?: string; data?: Mascota }> {
  const parsed = mascotaCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    const mascota = await crearMascota(parsed.data)
    if (!mascota) {
      return { error: 'No pudimos crear la mascota' }
    }

    return { data: mascota }
  } catch (error) {
    console.error('Error creating mascota:', error)
    return { error: 'Error al crear la mascota' }
  }
}

/**
 * Get a single pet by ID
 */
export async function obtenerMascotaAction(mascotaId: string): Promise<{ error?: string; data?: Mascota }> {
  if (!mascotaId) {
    return { error: 'ID de mascota requerido' }
  }

  try {
    const mascota = await obtenerMascota(mascotaId)
    if (!mascota) {
      return { error: 'Mascota no encontrada' }
    }

    return { data: mascota }
  } catch (error) {
    console.error('Error fetching mascota:', error)
    return { error: 'Error al obtener la mascota' }
  }
}

/**
 * List all pets for a client
 */
export async function listarMascotasClienteAction(clienteId: string): Promise<{ error?: string; data?: Mascota[] }> {
  if (!clienteId) {
    return { error: 'ID de cliente requerido' }
  }

  try {
    const mascotas = await listarMascotasPorCliente(clienteId)
    return { data: mascotas }
  } catch (error) {
    console.error('Error listing mascotas:', error)
    return { error: 'Error al listar mascotas' }
  }
}
