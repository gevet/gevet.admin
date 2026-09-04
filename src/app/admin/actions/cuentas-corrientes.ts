'use server'

import { z } from 'zod'
import { getDbContext } from '@/lib/db'
import type { CuentaCorriente, MovimientoCuentaCorriente } from '@/lib/types/database'

/**
 * Get cuenta corriente for a cliente with transaction history
 */
export async function obtenerCuentaCorrienteAction(clienteId: string) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    // Validate clienteId format
    if (!clienteId || clienteId.trim() === '') {
      return { error: 'ID de cliente requerido' }
    }

    // TODO: Implement database queries for:
    // 1. Fetch cuenta_corriente where cliente_id = clienteId AND tenant_id = context.tenant_id
    // 2. Verify cliente exists and belongs to tenant
    // 3. Fetch movimientos ordered by creado_en DESC (last 100)
    // 4. Return aggregated data

    return {
      data: {
        cuenta: null as CuentaCorriente | null,
        movimientos: [] as MovimientoCuentaCorriente[],
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
export async function obtenerClientesConCuentasAction(
  page: number = 1,
  _search: string = '',
) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    if (page < 1) return { error: 'Página inválida' }

    // TODO: Implement database queries for:
    // 1. Fetch clientes with cuentas_corrientes joined
    // 2. Filter by tenant_id
    // 3. Optional: full-text search on nombre, apellido, numero_documento
    // 4. Paginate (limit 20, offset (page-1)*20)
    // 5. Return {clientes, total, page, pageSize}

    return {
      data: {
        clientes: [],
        total: 0,
        page,
        pageSize: 20,
      },
    }
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

    registrarPagoSchema.parse(input)

    // TODO: Implement database transaction:
    // 1. Fetch cuenta_corriente for cliente
    // 2. Create movimiento with tipo='Abono'
    // 3. Update saldo_deuda
    // 4. Return updated cuenta with new movimiento

    return {
      data: {
        cuenta: null as CuentaCorriente | null,
        movimiento: null as MovimientoCuentaCorriente | null,
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

    crearActualizarCuentaSchema.parse(input)

    // TODO: Implement database operation:
    // 1. Check if cliente exists and belongs to tenant
    // 2. Upsert cuenta_corriente with validated data
    // 3. Return updated cuenta

    return {
      data: {
        cuenta: null as CuentaCorriente | null,
      },
    }
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

    // TODO: Implement database queries for:
    // 1. Total deuda (sum of saldo_deuda from all active accounts)
    // 2. Total saldo a favor (sum of saldo_favor)
    // 3. Clientes sin pagar (count where saldo_deuda > 0)
    // 4. Deuda vencida (count movimientos with fecha_vencimiento < today)
    // 5. Top 5 clientes by deuda

    return {
      data: {
        totalDeuda: 0,
        totalSaldoFavor: 0,
        clientesSinPagar: 0,
        deudaVencida: 0,
        clientesTop: [],
      },
    }
  } catch (error) {
    console.error('Error fetching resumen:', error)
    return { error: 'Error al obtener resumen' }
  }
}
