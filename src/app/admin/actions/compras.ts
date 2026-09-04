'use server'

import { z } from 'zod'
import { getSupabase, getDbContext } from '@/lib/db'
import type { Proveedor, OrdenCompra } from '@/lib/types/database'

const proveedorSchema = z.object({
  razon_social: z.string().min(1, 'La razón social es requerida'),
  nombre_fantasia: z.string().optional().nullable(),
  cuit: z.string().optional().nullable(),
  email: z.union([z.string().email('Email inválido'), z.string().length(0)]).optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  ciudad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  contacto: z.string().optional().nullable(),
  condicion_pago: z.string().default('Contado'),
  observaciones: z.string().optional().nullable(),
})

const ordenCompraSchema = z.object({
  proveedor_id: z.string().uuid('Proveedor requerido'),
  fecha_entrega_estimada: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        producto_id: z.string().uuid('Producto requerido'),
        cantidad: z.number().int().positive('La cantidad debe ser positiva'),
        precio_unitario: z.number().nonnegative('El precio no puede ser negativo'),
      }),
    )
    .min(1, 'Agregá al menos un producto a la orden'),
})

/** Create a supplier */
export async function crearProveedorAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = proveedorSchema.parse(input)
    const supabase = await getSupabase()

    const { data, error } = await supabase
      .from('proveedores')
      .insert({
        tenant_id: context.tenant_id,
        razon_social: validated.razon_social,
        nombre_fantasia: validated.nombre_fantasia || null,
        cuit: validated.cuit || null,
        email: validated.email || null,
        telefono: validated.telefono || null,
        direccion: validated.direccion || null,
        ciudad: validated.ciudad || null,
        provincia: validated.provincia || null,
        contacto: validated.contacto || null,
        condicion_pago: validated.condicion_pago,
        observaciones: validated.observaciones || null,
        activo: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating proveedor:', error)
      return { error: `Error al crear el proveedor: ${error.message}` }
    }

    return { success: true, data: data as Proveedor }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.errors[0].message }
    console.error('Proveedor creation error:', error)
    return { error: 'Error al crear el proveedor' }
  }
}

/** List active suppliers */
export async function listarProveedoresAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('proveedores')
      .select()
      .eq('activo', true)
      .order('razon_social')

    if (error) {
      console.error('Error listing proveedores:', error)
      return { error: 'Error al listar proveedores' }
    }

    return { success: true, data: (data || []) as Proveedor[] }
  } catch (error) {
    console.error('List proveedores error:', error)
    return { error: 'Error al listar proveedores' }
  }
}

/** Soft-delete a supplier */
export async function eliminarProveedorAction(proveedorId: string) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { error } = await supabase.from('proveedores').update({ activo: false }).eq('id', proveedorId)

    if (error) return { error: 'Error al eliminar el proveedor' }
    return { success: true }
  } catch (error) {
    console.error('Proveedor deletion error:', error)
    return { error: 'Error al eliminar el proveedor' }
  }
}

/** Create a purchase order with its line items */
export async function crearOrdenCompraAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = ordenCompraSchema.parse(input)
    const supabase = await getSupabase()

    const subtotal = validated.items.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0)
    const total = Math.round(subtotal * 100) / 100

    const { data: numeroData, error: numeroError } = await supabase.rpc('siguiente_numero', {
      p_tenant_id: context.tenant_id,
      p_tipo: 'orden_compra',
    })

    if (numeroError) {
      console.error('Error getting sequence:', numeroError)
      return { error: 'Error al numerar la orden de compra' }
    }

    const { data: orden, error: ordenError } = await supabase
      .from('ordenes_compra')
      .insert({
        tenant_id: context.tenant_id,
        proveedor_id: validated.proveedor_id,
        numero: numeroData as number,
        fecha_entrega_estimada: validated.fecha_entrega_estimada || null,
        estado: 'Borrador',
        subtotal: total,
        impuestos: 0,
        total,
        observaciones: validated.observaciones || null,
        creado_por: context.user_id,
      })
      .select()
      .single()

    if (ordenError || !orden) {
      console.error('Error creating orden:', ordenError)
      return { error: `Error al crear la orden: ${ordenError?.message ?? 'desconocido'}` }
    }

    const items = validated.items.map((i) => ({
      tenant_id: context.tenant_id,
      orden_id: orden.id,
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      cantidad_recibida: 0,
      precio_unitario: i.precio_unitario,
      subtotal: Math.round(i.precio_unitario * i.cantidad * 100) / 100,
    }))

    const { error: itemsError } = await supabase.from('ordenes_compra_items').insert(items)

    if (itemsError) {
      // Roll back the header so we never leave an order without its lines
      await supabase.from('ordenes_compra').delete().eq('id', orden.id)
      console.error('Error creating orden items:', itemsError)
      return { error: `Error al cargar los ítems: ${itemsError.message}` }
    }

    return { success: true, data: orden as OrdenCompra }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.errors[0].message }
    console.error('Orden compra creation error:', error)
    return { error: 'Error al crear la orden de compra' }
  }
}

/** List purchase orders with supplier name resolved */
export async function listarOrdenesCompraAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('ordenes_compra')
      .select('*, proveedores(razon_social)')
      .order('numero', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error listing ordenes:', error)
      return { error: 'Error al listar órdenes de compra' }
    }

    return { success: true, data: (data || []) as Array<OrdenCompra & { proveedores: { razon_social: string } | null }> }
  } catch (error) {
    console.error('List ordenes error:', error)
    return { error: 'Error al listar órdenes de compra' }
  }
}

/** Get one purchase order with its line items */
export async function obtenerOrdenCompraAction(ordenId: string) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data: orden, error: ordenError } = await supabase
      .from('ordenes_compra')
      .select('*, proveedores(razon_social)')
      .eq('id', ordenId)
      .single()

    if (ordenError || !orden) return { error: 'Orden no encontrada' }

    const { data: items } = await supabase
      .from('ordenes_compra_items')
      .select('*, productos(nombre, unidad)')
      .eq('orden_id', ordenId)

    return { success: true, data: { orden, items: items || [] } }
  } catch (error) {
    console.error('Get orden error:', error)
    return { error: 'Error al obtener la orden' }
  }
}

/**
 * Change a purchase order status. Moving to "Recibida" fires the database
 * trigger that adds the pending quantities into product stock.
 */
export async function actualizarEstadoOrdenCompraAction(
  ordenId: string,
  estado: OrdenCompra['estado'],
) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('ordenes_compra')
      .update({ estado })
      .eq('id', ordenId)
      .select()
      .single()

    if (error) {
      console.error('Error updating orden estado:', error)
      return { error: `Error al actualizar la orden: ${error.message}` }
    }

    return { success: true, data: data as OrdenCompra }
  } catch (error) {
    console.error('Update orden error:', error)
    return { error: 'Error al actualizar la orden' }
  }
}
