'use server'

import { z } from 'zod'
import { getSupabase, getDbContext } from '@/lib/db'
import type { CuentaContable, AsientoContable } from '@/lib/types/database'

const cuentaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.enum(['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Egreso']),
  imputable: z.boolean().default(true),
})

const asientoSchema = z
  .object({
    fecha: z.string().min(1, 'La fecha es requerida'),
    descripcion: z.string().min(1, 'La descripción es requerida'),
    referencia_tipo: z.string().optional().nullable(),
    referencia_id: z.string().uuid().optional().nullable(),
    lineas: z
      .array(
        z.object({
          cuenta_id: z.string().uuid('Cuenta requerida'),
          debe: z.number().nonnegative().default(0),
          haber: z.number().nonnegative().default(0),
          descripcion: z.string().optional().nullable(),
        }),
      )
      .min(2, 'Un asiento necesita al menos dos líneas'),
  })
  .refine(
    (data) => {
      const debe = data.lineas.reduce((s, l) => s + l.debe, 0)
      const haber = data.lineas.reduce((s, l) => s + l.haber, 0)
      return Math.abs(debe - haber) < 0.01
    },
    { message: 'El asiento no balancea: el debe debe ser igual al haber' },
  )
  .refine((data) => data.lineas.every((l) => !(l.debe > 0 && l.haber > 0)), {
    message: 'Cada línea puede tener importe en el debe o en el haber, no en ambos',
  })
  .refine((data) => data.lineas.every((l) => l.debe > 0 || l.haber > 0), {
    message: 'Cada línea necesita un importe en el debe o en el haber',
  })

/** Create a chart-of-accounts entry */
export async function crearCuentaAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = cuentaSchema.parse(input)
    const supabase = await getSupabase()

    const { data, error } = await supabase
      .from('plan_cuentas')
      .insert({ ...validated, tenant_id: context.tenant_id, activo: true })
      .select()
      .single()

    if (error) {
      console.error('Error creating cuenta:', error)
      return { error: `Error al crear la cuenta: ${error.message}` }
    }

    return { success: true, data: data as CuentaContable }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.errors[0].message }
    console.error('Cuenta creation error:', error)
    return { error: 'Error al crear la cuenta' }
  }
}

/** List the chart of accounts */
export async function listarCuentasAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('plan_cuentas')
      .select()
      .eq('activo', true)
      .order('codigo')

    if (error) return { error: 'Error al listar el plan de cuentas' }
    return { success: true, data: (data || []) as CuentaContable[] }
  } catch (error) {
    console.error('List cuentas error:', error)
    return { error: 'Error al listar el plan de cuentas' }
  }
}

/** Create a balanced journal entry with its lines */
export async function crearAsientoAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = asientoSchema.parse(input)
    const supabase = await getSupabase()

    const totalDebe = Math.round(validated.lineas.reduce((s, l) => s + l.debe, 0) * 100) / 100
    const totalHaber = Math.round(validated.lineas.reduce((s, l) => s + l.haber, 0) * 100) / 100

    const { data: numeroData, error: numeroError } = await supabase.rpc('siguiente_numero', {
      p_tenant_id: context.tenant_id,
      p_tipo: 'asiento',
    })

    if (numeroError) {
      console.error('Error getting sequence:', numeroError)
      return { error: 'Error al numerar el asiento' }
    }

    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert({
        tenant_id: context.tenant_id,
        numero: numeroData as number,
        fecha: validated.fecha,
        descripcion: validated.descripcion,
        referencia_tipo: validated.referencia_tipo || null,
        referencia_id: validated.referencia_id || null,
        total_debe: totalDebe,
        total_haber: totalHaber,
        estado: 'Registrado',
        creado_por: context.user_id,
      })
      .select()
      .single()

    if (asientoError || !asiento) {
      console.error('Error creating asiento:', asientoError)
      return { error: `Error al crear el asiento: ${asientoError?.message ?? 'desconocido'}` }
    }

    const lineas = validated.lineas.map((l) => ({
      tenant_id: context.tenant_id,
      asiento_id: asiento.id,
      cuenta_id: l.cuenta_id,
      debe: l.debe,
      haber: l.haber,
      descripcion: l.descripcion || null,
    }))

    const { error: lineasError } = await supabase.from('asientos_lineas').insert(lineas)

    if (lineasError) {
      // Never leave a header without its lines
      await supabase.from('asientos_contables').delete().eq('id', asiento.id)
      console.error('Error creating asiento lineas:', lineasError)
      return { error: `Error al cargar las líneas: ${lineasError.message}` }
    }

    return { success: true, data: asiento as AsientoContable }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.errors[0].message }
    console.error('Asiento creation error:', error)
    return { error: 'Error al crear el asiento' }
  }
}

/** List journal entries (libro diario) */
export async function listarAsientosAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('asientos_contables')
      .select()
      .order('numero', { ascending: false })
      .limit(200)

    if (error) return { error: 'Error al listar los asientos' }
    return { success: true, data: (data || []) as AsientoContable[] }
  } catch (error) {
    console.error('List asientos error:', error)
    return { error: 'Error al listar los asientos' }
  }
}

/** Get one journal entry with its lines and account names */
export async function obtenerAsientoAction(asientoId: string) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data: asiento, error } = await supabase
      .from('asientos_contables')
      .select()
      .eq('id', asientoId)
      .single()

    if (error || !asiento) return { error: 'Asiento no encontrado' }

    const { data: lineas } = await supabase
      .from('asientos_lineas')
      .select('*, plan_cuentas(codigo, nombre)')
      .eq('asiento_id', asientoId)

    return { success: true, data: { asiento, lineas: lineas || [] } }
  } catch (error) {
    console.error('Get asiento error:', error)
    return { error: 'Error al obtener el asiento' }
  }
}

/**
 * Trial balance: accumulated debe/haber per account, with its balance.
 */
export async function obtenerBalanceSumasYSaldosAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data: cuentas, error: cuentasError } = await supabase
      .from('plan_cuentas')
      .select()
      .eq('activo', true)
      .order('codigo')

    if (cuentasError) return { error: 'Error al obtener el plan de cuentas' }

    const { data: lineas, error: lineasError } = await supabase
      .from('asientos_lineas')
      .select('cuenta_id, debe, haber')

    if (lineasError) return { error: 'Error al obtener los movimientos' }

    const totales = new Map<string, { debe: number; haber: number }>()
    for (const linea of lineas || []) {
      const actual = totales.get(linea.cuenta_id) || { debe: 0, haber: 0 }
      actual.debe += Number(linea.debe) || 0
      actual.haber += Number(linea.haber) || 0
      totales.set(linea.cuenta_id, actual)
    }

    const balance = (cuentas || []).map((cuenta) => {
      const t = totales.get(cuenta.id) || { debe: 0, haber: 0 }
      return {
        cuenta: cuenta as CuentaContable,
        debe: Math.round(t.debe * 100) / 100,
        haber: Math.round(t.haber * 100) / 100,
        saldo: Math.round((t.debe - t.haber) * 100) / 100,
      }
    })

    return { success: true, data: balance }
  } catch (error) {
    console.error('Balance error:', error)
    return { error: 'Error al calcular el balance' }
  }
}

/** Seed a minimal Argentine-style chart of accounts */
export async function cargarPlanCuentasBaseAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const cuentas = [
      { codigo: '1.1.01', nombre: 'Caja', tipo: 'Activo' as const, imputable: true },
      { codigo: '1.1.02', nombre: 'Banco cuenta corriente', tipo: 'Activo' as const, imputable: true },
      { codigo: '1.1.03', nombre: 'Deudores por ventas', tipo: 'Activo' as const, imputable: true },
      { codigo: '1.2.01', nombre: 'Mercaderías', tipo: 'Activo' as const, imputable: true },
      { codigo: '1.3.01', nombre: 'Instrumental y equipos', tipo: 'Activo' as const, imputable: true },
      { codigo: '2.1.01', nombre: 'Proveedores', tipo: 'Pasivo' as const, imputable: true },
      { codigo: '2.1.02', nombre: 'Sueldos a pagar', tipo: 'Pasivo' as const, imputable: true },
      { codigo: '2.1.03', nombre: 'IVA a pagar', tipo: 'Pasivo' as const, imputable: true },
      { codigo: '3.1.01', nombre: 'Capital', tipo: 'Patrimonio' as const, imputable: true },
      { codigo: '3.2.01', nombre: 'Resultados acumulados', tipo: 'Patrimonio' as const, imputable: true },
      { codigo: '4.1.01', nombre: 'Ventas de productos', tipo: 'Ingreso' as const, imputable: true },
      { codigo: '4.1.02', nombre: 'Servicios veterinarios', tipo: 'Ingreso' as const, imputable: true },
      { codigo: '4.1.03', nombre: 'Servicios de laboratorio', tipo: 'Ingreso' as const, imputable: true },
      { codigo: '5.1.01', nombre: 'Costo de mercadería vendida', tipo: 'Egreso' as const, imputable: true },
      { codigo: '5.2.01', nombre: 'Sueldos y cargas sociales', tipo: 'Egreso' as const, imputable: true },
      { codigo: '5.2.02', nombre: 'Alquileres', tipo: 'Egreso' as const, imputable: true },
      { codigo: '5.2.03', nombre: 'Servicios públicos', tipo: 'Egreso' as const, imputable: true },
      { codigo: '5.2.04', nombre: 'Gastos generales', tipo: 'Egreso' as const, imputable: true },
    ]

    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('plan_cuentas')
      .upsert(
        cuentas.map((c) => ({ ...c, tenant_id: context.tenant_id, activo: true })),
        { onConflict: 'tenant_id,codigo' },
      )
      .select()

    if (error) {
      console.error('Error seeding plan de cuentas:', error)
      return { error: `Error al cargar el plan de cuentas: ${error.message}` }
    }

    return { success: true, data: (data || []) as CuentaContable[] }
  } catch (error) {
    console.error('Seed plan cuentas error:', error)
    return { error: 'Error al cargar el plan de cuentas' }
  }
}
