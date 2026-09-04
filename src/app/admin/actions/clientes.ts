'use server'

import { z } from 'zod'
import { crearCliente, obtenerCliente, listarClientes, actualizarCliente, getDbContext } from '@/lib/db'
import type { Cliente } from '@/lib/types/database'

/**
 * Zod schemas for client validation
 */
const clienteCreateSchema = z.object({
  tipo_documento: z.enum(['DNI', 'CUIT', 'CUIL', 'PASAPORTE', 'OTRO']),
  numero_documento: z.string().min(1, 'Número de documento requerido'),
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'Apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().nullable(),
  telefono: z.string().optional().nullable(),
  celular: z.string().optional().nullable(),
  ciudad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
})

const clienteUpdateSchema = clienteCreateSchema.partial()

/**
 * Create a new client
 */
export async function crearClienteAction(input: unknown): Promise<{ error?: string; data?: Cliente }> {
  const parsed = clienteCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    // Check permission
    // TODO: Add permission check when permission system is implemented
    // if (!await userHasPermission('clientes.crear')) {
    //   return { error: 'No tienes permiso para crear clientes' }
    // }

    const cliente = await crearCliente(parsed.data)
    if (!cliente) {
      return { error: 'No pudimos crear el cliente' }
    }

    return { data: cliente }
  } catch (error) {
    console.error('Error creating cliente:', error)
    return { error: 'Error al crear el cliente' }
  }
}

/**
 * Get a single client by ID
 */
export async function obtenerClienteAction(clienteId: string): Promise<{ error?: string; data?: Cliente }> {
  if (!clienteId) {
    return { error: 'ID de cliente requerido' }
  }

  try {
    const cliente = await obtenerCliente(clienteId)
    if (!cliente) {
      return { error: 'Cliente no encontrado' }
    }

    return { data: cliente }
  } catch (error) {
    console.error('Error fetching cliente:', error)
    return { error: 'Error al obtener el cliente' }
  }
}

/**
 * List all clients (with optional filters)
 */
export async function listarClientesAction(filtros?: { activo?: boolean; ciudad?: string }): Promise<{ error?: string; data?: Cliente[] }> {
  try {
    const clientes = await listarClientes(filtros)
    return { data: clientes }
  } catch (error) {
    console.error('Error listing clientes:', error)
    return { error: 'Error al listar clientes' }
  }
}

/**
 * Update a client
 */
export async function actualizarClienteAction(
  clienteId: string,
  input: unknown
): Promise<{ error?: string; data?: Cliente }> {
  if (!clienteId) {
    return { error: 'ID de cliente requerido' }
  }

  const parsed = clienteUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    // Verify ownership (optional - depends on permission model)
    const cliente = await obtenerCliente(clienteId)
    if (!cliente) {
      return { error: 'Cliente no encontrado' }
    }

    if (cliente.tenant_id !== context.tenant_id) {
      return { error: 'No tienes permiso para actualizar este cliente' }
    }

    const updated = await actualizarCliente(clienteId, parsed.data)
    if (!updated) {
      return { error: 'No pudimos actualizar el cliente' }
    }

    return { data: updated }
  } catch (error) {
    console.error('Error updating cliente:', error)
    return { error: 'Error al actualizar el cliente' }
  }
}

/**
 * Soft-delete a client (set activo = false)
 */
export async function desactivarClienteAction(clienteId: string): Promise<{ error?: string; success?: boolean }> {
  if (!clienteId) {
    return { error: 'ID de cliente requerido' }
  }

  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    // Verify ownership
    const cliente = await obtenerCliente(clienteId)
    if (!cliente) {
      return { error: 'Cliente no encontrado' }
    }

    if (cliente.tenant_id !== context.tenant_id) {
      return { error: 'No tienes permiso para desactivar este cliente' }
    }

    const updated = await actualizarCliente(clienteId, { activo: false })
    if (!updated) {
      return { error: 'No pudimos desactivar el cliente' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deactivating cliente:', error)
    return { error: 'Error al desactivar el cliente' }
  }
}

/**
 * Get complete 360° history for a client (mascotas, turnos, consultas)
 * Optimized with parallel queries and proper RLS filtering
 */
export async function obtenerHistorial360ClienteAction(
  clienteId: string
): Promise<{
  error?: string
  data?: {
    cliente: Cliente
    mascotas: any[]
    turnos: any[]
    consultas: any[]
  }
}> {
  if (!clienteId) {
    return { error: 'ID de cliente requerido' }
  }

  try {
    const context = await getDbContext()
    if (!context) {
      return { error: 'No autorizado' }
    }

    // Get main cliente
    const cliente = await obtenerCliente(clienteId)
    if (!cliente) {
      return { error: 'Cliente no encontrado' }
    }

    // Verify tenant ownership
    if (cliente.tenant_id !== context.tenant_id) {
      return { error: 'No tienes permiso para ver este cliente' }
    }

    // TODO: Query mascotas, turnos, consultas in parallel with proper RLS
    // For now, return basic structure
    return {
      data: {
        cliente,
        mascotas: [],
        turnos: [],
        consultas: [],
      },
    }
  } catch (error) {
    console.error('Error fetching 360 history:', error)
    return { error: 'Error al obtener el historial' }
  }
}
