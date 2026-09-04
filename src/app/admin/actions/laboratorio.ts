'use server'

import { z } from 'zod'
import { getSupabase, getDbContext } from '@/lib/db'
import type { EstudioLaboratorio, OrdenLaboratorio } from '@/lib/types/database'

const estudioSchema = z.object({
  nombre: z.string().min(1, 'El nombre del estudio es requerido'),
  codigo: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  precio: z.number().nonnegative('El precio no puede ser negativo').default(0),
  unidad: z.string().optional().nullable(),
  valor_referencia_min: z.number().optional().nullable(),
  valor_referencia_max: z.number().optional().nullable(),
  tiempo_entrega_horas: z.number().int().positive().default(24),
})

const ordenSchema = z.object({
  consulta_id: z.string().uuid().optional().nullable(),
  cliente_id: z.string().uuid('Cliente requerido'),
  mascota_id: z.string().uuid('Mascota requerida'),
  prioridad: z.enum(['Normal', 'Urgente']).default('Normal'),
  observaciones: z.string().optional().nullable(),
  estudios: z.array(z.string().uuid()).min(1, 'Seleccioná al menos un estudio'),
})

const resultadoSchema = z.object({
  item_id: z.string().uuid('Ítem requerido'),
  resultado: z.string().optional().nullable(),
  valor_numerico: z.number().optional().nullable(),
  observaciones: z.string().optional().nullable(),
})

/** Create a lab study in the catalogue */
export async function crearEstudioAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = estudioSchema.parse(input)
    const supabase = await getSupabase()

    const { data, error } = await supabase
      .from('estudios_laboratorio')
      .insert({
        tenant_id: context.tenant_id,
        nombre: validated.nombre,
        codigo: validated.codigo || null,
        categoria: validated.categoria || null,
        precio: validated.precio,
        unidad: validated.unidad || null,
        valor_referencia_min: validated.valor_referencia_min ?? null,
        valor_referencia_max: validated.valor_referencia_max ?? null,
        tiempo_entrega_horas: validated.tiempo_entrega_horas,
        activo: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating estudio:', error)
      return { error: `Error al crear el estudio: ${error.message}` }
    }

    return { success: true, data: data as EstudioLaboratorio }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.errors[0].message }
    console.error('Estudio creation error:', error)
    return { error: 'Error al crear el estudio' }
  }
}

/** List the lab study catalogue */
export async function listarEstudiosAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('estudios_laboratorio')
      .select()
      .eq('activo', true)
      .order('nombre')

    if (error) return { error: 'Error al listar los estudios' }
    return { success: true, data: (data || []) as EstudioLaboratorio[] }
  } catch (error) {
    console.error('List estudios error:', error)
    return { error: 'Error al listar los estudios' }
  }
}

/** Create a lab order with the requested studies as line items */
export async function crearOrdenLaboratorioAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = ordenSchema.parse(input)
    const supabase = await getSupabase()

    const { data: estudios, error: estudiosError } = await supabase
      .from('estudios_laboratorio')
      .select()
      .in('id', validated.estudios)

    if (estudiosError || !estudios?.length) {
      return { error: 'No se encontraron los estudios seleccionados' }
    }

    const total = Math.round(estudios.reduce((s, e) => s + (Number(e.precio) || 0), 0) * 100) / 100

    const { data: numeroData, error: numeroError } = await supabase.rpc('siguiente_numero', {
      p_tenant_id: context.tenant_id,
      p_tipo: 'orden_laboratorio',
    })

    if (numeroError) {
      console.error('Error getting sequence:', numeroError)
      return { error: 'Error al numerar la orden' }
    }

    const { data: orden, error: ordenError } = await supabase
      .from('ordenes_laboratorio')
      .insert({
        tenant_id: context.tenant_id,
        consulta_id: validated.consulta_id || null,
        cliente_id: validated.cliente_id,
        mascota_id: validated.mascota_id,
        numero: numeroData as number,
        estado: 'Solicitada',
        prioridad: validated.prioridad,
        total,
        observaciones: validated.observaciones || null,
        creado_por: context.user_id,
      })
      .select()
      .single()

    if (ordenError || !orden) {
      console.error('Error creating orden lab:', ordenError)
      return { error: `Error al crear la orden: ${ordenError?.message ?? 'desconocido'}` }
    }

    const items = estudios.map((e) => ({
      tenant_id: context.tenant_id,
      orden_id: orden.id,
      estudio_id: e.id,
      precio: e.precio,
      unidad: e.unidad,
    }))

    const { error: itemsError } = await supabase.from('ordenes_laboratorio_items').insert(items)

    if (itemsError) {
      await supabase.from('ordenes_laboratorio').delete().eq('id', orden.id)
      console.error('Error creating orden lab items:', itemsError)
      return { error: `Error al cargar los estudios: ${itemsError.message}` }
    }

    return { success: true, data: orden as OrdenLaboratorio }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.errors[0].message }
    console.error('Orden lab creation error:', error)
    return { error: 'Error al crear la orden de laboratorio' }
  }
}

/** List lab orders with patient and owner resolved */
export async function listarOrdenesLaboratorioAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('ordenes_laboratorio')
      .select('*, mascotas(nombre, especie), clientes(nombre, apellido)')
      .order('numero', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error listing ordenes lab:', error)
      return { error: 'Error al listar las órdenes' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('List ordenes lab error:', error)
    return { error: 'Error al listar las órdenes' }
  }
}

/** Get a lab order with its studies and results */
export async function obtenerOrdenLaboratorioAction(ordenId: string) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data: orden, error } = await supabase
      .from('ordenes_laboratorio')
      .select('*, mascotas(nombre, especie), clientes(nombre, apellido)')
      .eq('id', ordenId)
      .single()

    if (error || !orden) return { error: 'Orden no encontrada' }

    const { data: items } = await supabase
      .from('ordenes_laboratorio_items')
      .select('*, estudios_laboratorio(nombre, unidad, valor_referencia_min, valor_referencia_max)')
      .eq('orden_id', ordenId)

    return { success: true, data: { orden, items: items || [] } }
  } catch (error) {
    console.error('Get orden lab error:', error)
    return { error: 'Error al obtener la orden' }
  }
}

/**
 * Record a result for one study. Flags out-of-range values against the
 * study's reference interval so the report can highlight them.
 */
export async function cargarResultadoAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = resultadoSchema.parse(input)
    const supabase = await getSupabase()

    const { data: item, error: itemError } = await supabase
      .from('ordenes_laboratorio_items')
      .select('*, estudios_laboratorio(valor_referencia_min, valor_referencia_max)')
      .eq('id', validated.item_id)
      .single()

    if (itemError || !item) return { error: 'Ítem no encontrado' }

    const referencia = item.estudios_laboratorio as {
      valor_referencia_min: number | null
      valor_referencia_max: number | null
    } | null

    const valorNumerico = validated.valor_numerico ?? null
    let fueraDeRango: boolean | null = null
    if (valorNumerico !== null && referencia) {
      const min = referencia.valor_referencia_min
      const max = referencia.valor_referencia_max
      if (min !== null || max !== null) {
        fueraDeRango =
          (min !== null && valorNumerico < min) || (max !== null && valorNumerico > max)
      }
    }

    const { data, error } = await supabase
      .from('ordenes_laboratorio_items')
      .update({
        resultado: validated.resultado || null,
        valor_numerico: valorNumerico,
        observaciones: validated.observaciones || null,
        fuera_de_rango: fueraDeRango,
        fecha_resultado: new Date().toISOString(),
      })
      .eq('id', validated.item_id)
      .select()
      .single()

    if (error) {
      console.error('Error saving resultado:', error)
      return { error: `Error al guardar el resultado: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.errors[0].message }
    console.error('Resultado error:', error)
    return { error: 'Error al guardar el resultado' }
  }
}

/** Change a lab order status */
export async function actualizarEstadoOrdenLaboratorioAction(
  ordenId: string,
  estado: OrdenLaboratorio['estado'],
) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('ordenes_laboratorio')
      .update({ estado })
      .eq('id', ordenId)
      .select()
      .single()

    if (error) return { error: `Error al actualizar la orden: ${error.message}` }
    return { success: true, data: data as OrdenLaboratorio }
  } catch (error) {
    console.error('Update orden lab error:', error)
    return { error: 'Error al actualizar la orden' }
  }
}

/** Seed a common veterinary lab catalogue */
export async function cargarEstudiosBaseAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const estudios = [
      { nombre: 'Hemograma completo', categoria: 'Hematología', precio: 3500, unidad: null, valor_referencia_min: null, valor_referencia_max: null, tiempo_entrega_horas: 24 },
      { nombre: 'Hematocrito', categoria: 'Hematología', precio: 1200, unidad: '%', valor_referencia_min: 37, valor_referencia_max: 55, tiempo_entrega_horas: 4 },
      { nombre: 'Hemoglobina', categoria: 'Hematología', precio: 1200, unidad: 'g/dL', valor_referencia_min: 12, valor_referencia_max: 18, tiempo_entrega_horas: 4 },
      { nombre: 'Urea', categoria: 'Bioquímica', precio: 1800, unidad: 'mg/dL', valor_referencia_min: 20, valor_referencia_max: 60, tiempo_entrega_horas: 24 },
      { nombre: 'Creatinina', categoria: 'Bioquímica', precio: 1800, unidad: 'mg/dL', valor_referencia_min: 0.5, valor_referencia_max: 1.6, tiempo_entrega_horas: 24 },
      { nombre: 'Glucemia', categoria: 'Bioquímica', precio: 1500, unidad: 'mg/dL', valor_referencia_min: 70, valor_referencia_max: 120, tiempo_entrega_horas: 4 },
      { nombre: 'ALT (GPT)', categoria: 'Bioquímica', precio: 2000, unidad: 'U/L', valor_referencia_min: 10, valor_referencia_max: 100, tiempo_entrega_horas: 24 },
      { nombre: 'Fosfatasa alcalina', categoria: 'Bioquímica', precio: 2000, unidad: 'U/L', valor_referencia_min: 20, valor_referencia_max: 150, tiempo_entrega_horas: 24 },
      { nombre: 'Orina completa', categoria: 'Orina', precio: 2200, unidad: null, valor_referencia_min: null, valor_referencia_max: null, tiempo_entrega_horas: 24 },
      { nombre: 'Coproparasitológico', categoria: 'Parasitología', precio: 2500, unidad: null, valor_referencia_min: null, valor_referencia_max: null, tiempo_entrega_horas: 48 },
      { nombre: 'Test rápido Parvovirus', categoria: 'Test rápidos', precio: 4500, unidad: null, valor_referencia_min: null, valor_referencia_max: null, tiempo_entrega_horas: 1 },
      { nombre: 'Test rápido Leucemia felina (FeLV)', categoria: 'Test rápidos', precio: 5000, unidad: null, valor_referencia_min: null, valor_referencia_max: null, tiempo_entrega_horas: 1 },
      { nombre: 'Raspaje de piel', categoria: 'Dermatología', precio: 2800, unidad: null, valor_referencia_min: null, valor_referencia_max: null, tiempo_entrega_horas: 24 },
      { nombre: 'Citología de oído', categoria: 'Dermatología', precio: 2600, unidad: null, valor_referencia_min: null, valor_referencia_max: null, tiempo_entrega_horas: 24 },
    ]

    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('estudios_laboratorio')
      .upsert(
        estudios.map((e) => ({ ...e, codigo: null, tenant_id: context.tenant_id, activo: true })),
        { onConflict: 'tenant_id,nombre' },
      )
      .select()

    if (error) {
      console.error('Error seeding estudios:', error)
      return { error: `Error al cargar los estudios: ${error.message}` }
    }

    return { success: true, data: (data || []) as EstudioLaboratorio[] }
  } catch (error) {
    console.error('Seed estudios error:', error)
    return { error: 'Error al cargar los estudios' }
  }
}
