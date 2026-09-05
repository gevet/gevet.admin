'use server'

import { z } from 'zod'
import { getSupabase, getDbContext } from '@/lib/db'
import type { CuentaCorriente, MovimientoCuentaCorriente } from '@/lib/types/database'

/** Days of credit implied by each payment condition */
const DIAS_POR_CONDICION: Record<string, number> = {
  Contado: 0,
  'Plazo 7': 7,
  'Plazo 15': 15,
  'Plazo 30': 30,
  'Plazo 45': 45,
  'Plazo 60': 60,
}

/**
 * Get cuenta corriente for a cliente with transaction history
 */
export async function obtenerCuentaCorrienteAction(clienteId: string) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    if (!clienteId || clienteId.trim() === '') {
      return { error: 'ID de cliente requerido' }
    }

    const supabase = await getSupabase()

    // RLS scopes both reads to the caller's tenant, so a cliente from another
    // tenant simply comes back empty.
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', clienteId)
      .maybeSingle()

    if (!cliente) return { error: 'Cliente no encontrado' }

    const { data: cuenta } = await supabase
      .from('cuentas_corrientes')
      .select()
      .eq('cliente_id', clienteId)
      .maybeSingle()

    const { data: movimientos } = await supabase
      .from('movimientos_cuentas_corrientes')
      .select()
      .eq('cliente_id', clienteId)
      .order('creado_en', { ascending: false })
      .limit(100)

    return {
      data: {
        cuenta: (cuenta ?? null) as CuentaCorriente | null,
        movimientos: (movimientos ?? []) as MovimientoCuentaCorriente[],
      },
    }
  } catch (error) {
    console.error('Error fetching cuenta corriente:', error)
    return { error: 'Error al obtener cuenta corriente' }
  }
}

/**
 * Get lista de clientes with account summary
 */
export async function obtenerClientesConCuentasAction(page: number = 1, search: string = '') {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    if (page < 1) return { error: 'Página inválida' }

    const pageSize = 20
    const desde = (page - 1) * pageSize
    const supabase = await getSupabase()

    let query = supabase
      .from('clientes')
      .select('id, nombre, apellido, numero_documento, cuentas_corrientes(*)', { count: 'exact' })
      .eq('activo', true)

    if (search.trim()) {
      const termino = `%${search.trim()}%`
      query = query.or(
        `nombre.ilike.${termino},apellido.ilike.${termino},numero_documento.ilike.${termino}`,
      )
    }

    const { data, count, error } = await query
      .order('apellido')
      .range(desde, desde + pageSize - 1)

    if (error) {
      console.error('Error fetching clientes with cuentas:', error)
      return { error: 'Error al obtener clientes' }
    }

    // Supabase returns the embedded one-to-one relation as an array.
    // Clients without an account yet report zeroed balances.
    const clientes = (data ?? []).map((fila) => {
      const relacion = fila.cuentas_corrientes as unknown
      const cuenta = ((Array.isArray(relacion) ? relacion[0] : relacion) ??
        null) as CuentaCorriente | null
      return {
        id: String(fila.id),
        nombre: String(fila.nombre),
        apellido: String(fila.apellido),
        numero_documento: String(fila.numero_documento),
        saldo_deuda: Number(cuenta?.saldo_deuda ?? 0),
        saldo_favor: Number(cuenta?.saldo_favor ?? 0),
        limite_credito: Number(cuenta?.limite_credito ?? 0),
      }
    })

    return { data: { clientes, total: count ?? 0, page, pageSize } }
  } catch (error) {
    console.error('Error fetching clientes with cuentas:', error)
    return { error: 'Error al obtener clientes' }
  }
}

/**
 * Register a payment (abono) to cliente's account
 */
const registrarPagoSchema = z.object({
  clienteId: z.string().min(1, 'Cliente requerido'),
  monto: z.number().positive('Monto debe ser positivo'),
  descripcion: z.string().min(1, 'Descripción requerida'),
  fechaPago: z.string().datetime('Fecha inválida'),
})

export async function registrarPagoAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = registrarPagoSchema.parse(input)
    const supabase = await getSupabase()

    const { data: cuenta } = await supabase
      .from('cuentas_corrientes')
      .select()
      .eq('cliente_id', validated.clienteId)
      .maybeSingle()

    if (!cuenta) {
      return { error: 'El cliente no tiene cuenta corriente abierta' }
    }

    const saldoAnterior = Number(cuenta.saldo_deuda)

    // A payment above the outstanding debt leaves the remainder as credit
    // in favour of the client rather than a negative debt.
    const aplicadoADeuda = Math.min(validated.monto, saldoAnterior)
    const excedente = Math.round((validated.monto - aplicadoADeuda) * 100) / 100
    const saldoNuevo = Math.round((saldoAnterior - aplicadoADeuda) * 100) / 100
    const saldoFavor = Math.round((Number(cuenta.saldo_favor) + excedente) * 100) / 100

    const { data: movimiento, error: movimientoError } = await supabase
      .from('movimientos_cuentas_corrientes')
      .insert({
        tenant_id: context.tenant_id,
        cliente_id: validated.clienteId,
        cuenta_corriente_id: cuenta.id,
        tipo: 'Abono',
        monto: validated.monto,
        saldo_anterior: saldoAnterior,
        saldo_nuevo: saldoNuevo,
        referencia_tipo: 'Pago',
        descripcion: validated.descripcion,
        creado_por: context.user_id,
      })
      .select()
      .single()

    if (movimientoError || !movimiento) {
      console.error('Error registering pago:', movimientoError)
      return { error: `Error al registrar pago: ${movimientoError?.message ?? 'desconocido'}` }
    }

    const { data: cuentaActualizada, error: cuentaError } = await supabase
      .from('cuentas_corrientes')
      .update({ saldo_deuda: saldoNuevo, saldo_favor: saldoFavor })
      .eq('id', cuenta.id)
      .select()
      .single()

    if (cuentaError) {
      // Undo the movement so the ledger never disagrees with the balance
      await supabase.from('movimientos_cuentas_corrientes').delete().eq('id', movimiento.id)
      console.error('Error updating cuenta:', cuentaError)
      return { error: `Error al actualizar el saldo: ${cuentaError.message}` }
    }

    return {
      data: {
        cuenta: cuentaActualizada as CuentaCorriente,
        movimiento: movimiento as MovimientoCuentaCorriente,
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Error registering pago:', error)
    return { error: 'Error al registrar pago' }
  }
}

/**
 * Create or update cuenta corriente for cliente
 */
const crearActualizarCuentaSchema = z.object({
  clienteId: z.string().min(1, 'Cliente requerido'),
  limitCredito: z.number().nonnegative('Límite debe ser positivo o cero'),
  condicionPago: z.enum(['Contado', 'Plazo 7', 'Plazo 15', 'Plazo 30', 'Plazo 45', 'Plazo 60']),
  diasDeGracia: z.number().nonnegative('Días de gracia inválido'),
})

export async function crearActualizarCuentaAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = crearActualizarCuentaSchema.parse(input)
    const supabase = await getSupabase()

    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', validated.clienteId)
      .maybeSingle()

    if (!cliente) return { error: 'Cliente no encontrado' }

    const { data: cuenta, error } = await supabase
      .from('cuentas_corrientes')
      .upsert(
        {
          tenant_id: context.tenant_id,
          cliente_id: validated.clienteId,
          limite_credito: validated.limitCredito,
          condicion_pago: validated.condicionPago,
          dias_de_gracia: validated.diasDeGracia,
          activo: true,
        },
        { onConflict: 'cliente_id' },
      )
      .select()
      .single()

    if (error) {
      console.error('Error creating/updating cuenta:', error)
      return { error: `Error al crear/actualizar cuenta: ${error.message}` }
    }

    return { data: { cuenta: cuenta as CuentaCorriente } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Error creating/updating cuenta:', error)
    return { error: 'Error al crear/actualizar cuenta' }
  }
}

/**
 * Get resumen of accounts receivable for dashboard
 */
export async function obtenerResumenCuentasCorrientesAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()

    const { data: cuentas, error } = await supabase
      .from('cuentas_corrientes')
      .select('cliente_id, saldo_deuda, saldo_favor, condicion_pago, dias_de_gracia, clientes(nombre, apellido)')
      .eq('activo', true)

    if (error) {
      console.error('Error fetching resumen:', error)
      return { error: 'Error al obtener resumen' }
    }

    const filas = cuentas ?? []
    const totalDeuda = filas.reduce((sum, c) => sum + Number(c.saldo_deuda ?? 0), 0)
    const totalSaldoFavor = filas.reduce((sum, c) => sum + Number(c.saldo_favor ?? 0), 0)
    const clientesSinPagar = filas.filter((c) => Number(c.saldo_deuda ?? 0) > 0).length

    // Overdue: a charge is past its due date once the payment term plus the
    // grace period has elapsed since it was posted.
    const conDeuda = filas.filter((c) => Number(c.saldo_deuda ?? 0) > 0)
    let deudaVencida = 0

    if (conDeuda.length > 0) {
      const { data: cargos } = await supabase
        .from('movimientos_cuentas_corrientes')
        .select('cliente_id, creado_en, fecha_vencimiento')
        .eq('tipo', 'Cargo')
        .in(
          'cliente_id',
          conDeuda.map((c) => c.cliente_id),
        )

      const ahora = Date.now()
      const plazoPorCliente = new Map(
        conDeuda.map((c) => [
          c.cliente_id,
          (DIAS_POR_CONDICION[c.condicion_pago] ?? 0) + Number(c.dias_de_gracia ?? 0),
        ]),
      )

      const clientesVencidos = new Set<string>()
      for (const cargo of cargos ?? []) {
        const vencimiento = cargo.fecha_vencimiento
          ? new Date(cargo.fecha_vencimiento).getTime()
          : new Date(cargo.creado_en).getTime() +
            (plazoPorCliente.get(cargo.cliente_id) ?? 0) * 86400000
        if (vencimiento < ahora) clientesVencidos.add(cargo.cliente_id)
      }
      deudaVencida = clientesVencidos.size
    }

    const clientesTop = filas
      .filter((c) => Number(c.saldo_deuda ?? 0) > 0)
      .sort((a, b) => Number(b.saldo_deuda) - Number(a.saldo_deuda))
      .slice(0, 5)
      .map((c) => {
        const relacion = c.clientes as unknown
        const cliente = (Array.isArray(relacion) ? relacion[0] : relacion) as
          | { nombre: string; apellido: string }
          | null
        return {
          cliente_id: c.cliente_id,
          nombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente',
          saldo_deuda: Number(c.saldo_deuda),
        }
      })

    return {
      data: {
        totalDeuda: Math.round(totalDeuda * 100) / 100,
        totalSaldoFavor: Math.round(totalSaldoFavor * 100) / 100,
        clientesSinPagar,
        deudaVencida,
        clientesTop,
      },
    }
  } catch (error) {
    console.error('Error fetching resumen:', error)
    return { error: 'Error al obtener resumen' }
  }
}
