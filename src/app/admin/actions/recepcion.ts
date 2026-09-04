'use server'

import { z } from 'zod'
import { getSupabase, getDbContext } from '@/lib/db'
import type { CheckIn } from '@/lib/types/database'

const checkInSchema = z.object({
  turno_id: z.string().uuid().optional().nullable(),
  cliente_id: z.string().uuid('Cliente requerido'),
  mascota_id: z.string().uuid('Mascota requerida'),
  prioridad: z.enum(['Normal', 'Urgente', 'Emergencia']).default('Normal'),
  motivo: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
})

/** Register an arrival at reception */
export async function crearCheckInAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = checkInSchema.parse(input)
    const supabase = await getSupabase()

    const { data: numeroData, error: numeroError } = await supabase.rpc('siguiente_numero', {
      p_tenant_id: context.tenant_id,
      p_tipo: 'check_in',
    })

    if (numeroError) {
      console.error('Error getting sequence:', numeroError)
      return { error: 'Error al numerar el check-in' }
    }

    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        tenant_id: context.tenant_id,
        turno_id: validated.turno_id || null,
        cliente_id: validated.cliente_id,
        mascota_id: validated.mascota_id,
        numero: numeroData as number,
        estado: 'En Espera',
        prioridad: validated.prioridad,
        motivo: validated.motivo || null,
        observaciones: validated.observaciones || null,
        hora_llegada: new Date().toISOString(),
        creado_por: context.user_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating check-in:', error)
      return { error: `Error al registrar el check-in: ${error.message}` }
    }

    // Keep the appointment in sync so the agenda reflects the arrival
    if (validated.turno_id) {
      await supabase.from('turnos').update({ estado: 'Confirmado' }).eq('id', validated.turno_id)
    }

    return { success: true, data: data as CheckIn }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.errors[0].message }
    console.error('Check-in creation error:', error)
    return { error: 'Error al registrar el check-in' }
  }
}

/**
 * Today's waiting room, ordered by priority then arrival time.
 * Finished and no-show entries are excluded unless `incluirCerrados` is set.
 */
export async function listarSalaEsperaAction(incluirCerrados = false) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const inicioDia = new Date()
    inicioDia.setHours(0, 0, 0, 0)

    let query = supabase
      .from('check_ins')
      .select('*, mascotas(nombre, especie), clientes(nombre, apellido, telefono)')
      .gte('hora_llegada', inicioDia.toISOString())

    if (!incluirCerrados) {
      query = query.in('estado', ['En Espera', 'Llamado', 'En Atención'])
    }

    const { data, error } = await query.order('hora_llegada', { ascending: true })

    if (error) {
      console.error('Error listing sala de espera:', error)
      return { error: 'Error al cargar la sala de espera' }
    }

    // Emergencies first, then urgent, then arrival order within each bucket
    const pesoPrioridad: Record<string, number> = { Emergencia: 0, Urgente: 1, Normal: 2 }
    const ordenado = (data || []).sort((a, b) => {
      const diff = (pesoPrioridad[a.prioridad] ?? 2) - (pesoPrioridad[b.prioridad] ?? 2)
      if (diff !== 0) return diff
      return new Date(a.hora_llegada).getTime() - new Date(b.hora_llegada).getTime()
    })

    return { success: true, data: ordenado }
  } catch (error) {
    console.error('Sala de espera error:', error)
    return { error: 'Error al cargar la sala de espera' }
  }
}

/**
 * Advance a check-in through the reception flow, stamping the matching
 * timestamp for the new state.
 */
export async function actualizarEstadoCheckInAction(
  checkInId: string,
  estado: CheckIn['estado'],
  box?: string,
) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const ahora = new Date().toISOString()
    const updates: Record<string, unknown> = { estado }

    if (box !== undefined) updates.box = box || null

    if (estado === 'Llamado') updates.hora_llamado = ahora
    if (estado === 'En Atención') updates.hora_atencion = ahora
    if (estado === 'Finalizado' || estado === 'Ausente') updates.hora_salida = ahora

    const { data, error } = await supabase
      .from('check_ins')
      .update(updates)
      .eq('id', checkInId)
      .select()
      .single()

    if (error) {
      console.error('Error updating check-in:', error)
      return { error: `Error al actualizar el check-in: ${error.message}` }
    }

    // Mirror the state onto the linked appointment
    const checkIn = data as CheckIn
    if (checkIn.turno_id) {
      const estadoTurno =
        estado === 'En Atención'
          ? 'En Progreso'
          : estado === 'Finalizado'
            ? 'Completado'
            : estado === 'Ausente'
              ? 'No-Show'
              : null

      if (estadoTurno) {
        await supabase.from('turnos').update({ estado: estadoTurno }).eq('id', checkIn.turno_id)
      }
    }

    return { success: true, data: checkIn }
  } catch (error) {
    console.error('Update check-in error:', error)
    return { error: 'Error al actualizar el check-in' }
  }
}

/** Today's reception counters for the waiting-room header */
export async function obtenerResumenRecepcionAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const inicioDia = new Date()
    inicioDia.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('check_ins')
      .select('estado, hora_llegada, hora_atencion')
      .gte('hora_llegada', inicioDia.toISOString())

    if (error) return { error: 'Error al cargar el resumen' }

    const registros = data || []
    const enEspera = registros.filter((r) => r.estado === 'En Espera').length
    const enAtencion = registros.filter((r) => r.estado === 'En Atención').length
    const finalizados = registros.filter((r) => r.estado === 'Finalizado').length

    // Average wait, in minutes, over the entries that were already seen
    const atendidos = registros.filter((r) => r.hora_atencion)
    const esperaPromedio =
      atendidos.length > 0
        ? Math.round(
            atendidos.reduce(
              (sum, r) =>
                sum +
                (new Date(r.hora_atencion as string).getTime() - new Date(r.hora_llegada).getTime()) /
                  60000,
              0,
            ) / atendidos.length,
          )
        : 0

    return {
      success: true,
      data: { enEspera, enAtencion, finalizados, total: registros.length, esperaPromedio },
    }
  } catch (error) {
    console.error('Resumen recepcion error:', error)
    return { error: 'Error al cargar el resumen' }
  }
}
