'use server'

import { z } from 'zod'
import { getDbContext, crearProducto, listarProductos, actualizarProducto, crearVenta, listarVentasConsulta, listarVentasCliente, obtenerProducto } from '@/lib/db'

const productoSchema = z.object({
  nombre: z.string().min(1, 'Nombre del producto requerido'),
  descripcion: z.string().optional().nullable(),
  precio_venta: z.number().positive('Precio de venta debe ser positivo'),
  precio_costo: z.number().positive('Precio de costo debe ser positivo').optional().nullable(),
  stock_cantidad: z.number().int().min(0, 'Stock no puede ser negativo'),
  unidad: z.string().default('Unidad'),
  categoria: z.string().optional().nullable(),
  codigo_barras: z.string().optional().nullable(),
  proveedor: z.string().optional().nullable(),
})

const ventaSchema = z.object({
  consulta_id: z.string().uuid().optional().nullable(),
  cliente_id: z.string().uuid('ID de cliente requerido'),
  producto_id: z.string().uuid('ID de producto requerido'),
  cantidad: z.number().int().positive('Cantidad debe ser positiva'),
  precio_unitario: z.number().positive('Precio unitario debe ser positivo'),
  descuento_porcentaje: z.number().min(0).max(100).default(0),
  descuento_monto: z.number().min(0).default(0),
  metodo_pago: z.enum(['Contado', 'Tarjeta', 'Transferencia', 'Cuenta Corriente']).default('Contado'),
  observaciones: z.string().optional().nullable(),
})

/**
 * Create a new product
 */
export async function crearProductoAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = productoSchema.parse(input)

    const producto = await crearProducto(context.tenant_id, {
      ...validated,
      descripcion: validated.descripcion ?? null,
      precio_costo: validated.precio_costo ?? null,
      categoria: validated.categoria ?? null,
      codigo_barras: validated.codigo_barras ?? null,
      proveedor: validated.proveedor ?? null,
      activo: true,
    })

    if (!producto) {
      return { error: 'Error al crear el producto' }
    }

    return { success: true, data: producto }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Producto creation error:', error)
    return { error: 'Error al crear el producto' }
  }
}

/**
 * List all products
 */
export async function listarProductosAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const productos = await listarProductos(context.tenant_id)
    return { success: true, data: productos }
  } catch (error) {
    console.error('List productos error:', error)
    return { error: 'Error al listar productos' }
  }
}

/**
 * Create a sale/venta
 */
export async function crearVentaAction(input: unknown) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const validated = ventaSchema.parse(input)

    const producto = await obtenerProducto(validated.producto_id)
    if (!producto) {
      return { error: 'Producto no encontrado' }
    }

    if (producto.stock_cantidad < validated.cantidad) {
      return { error: `Stock insuficiente. Disponible: ${producto.stock_cantidad}` }
    }

    // Calculate totals
    const subtotal = validated.precio_unitario * validated.cantidad
    const descuentoMonto = validated.descuento_porcentaje > 0
      ? Math.round((subtotal * validated.descuento_porcentaje) / 100 * 100) / 100
      : validated.descuento_monto
    const total = Math.round((subtotal - descuentoMonto) * 100) / 100

    // Create venta
    const venta = await crearVenta(context.tenant_id, {
      consulta_id: validated.consulta_id ?? null,
      cliente_id: validated.cliente_id,
      producto_id: validated.producto_id,
      cantidad: validated.cantidad,
      precio_unitario: validated.precio_unitario,
      descuento_porcentaje: validated.descuento_porcentaje,
      descuento_monto: descuentoMonto,
      metodo_pago: validated.metodo_pago,
      observaciones: validated.observaciones ?? null,
      subtotal,
      total,
      estado: 'Completada',
      creado_por: context.user_id,
      referencia_comprobante: null,
    })

    if (!venta) {
      return { error: 'Error al registrar la venta' }
    }

    // Update product stock
    const nuevoStock = producto.stock_cantidad - validated.cantidad
    await actualizarProducto(validated.producto_id, {
      stock_cantidad: nuevoStock,
    })

    return { success: true, data: venta }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Venta creation error:', error)
    return { error: 'Error al registrar la venta' }
  }
}

/**
 * List sales for a consultation
 */
export async function listarVentasConsultaAction(consultaId: string) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const ventas = await listarVentasConsulta(consultaId)
    return { success: true, data: ventas }
  } catch (error) {
    console.error('List ventas error:', error)
    return { error: 'Error al listar ventas' }
  }
}

/**
 * List all sales for a client
 */
export async function listarVentasClienteAction(clienteId: string) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const ventas = await listarVentasCliente(clienteId)

    // Get product details for each sale
    const ventasConProductos = await Promise.all(
      ventas.map(async (venta) => {
        const producto = await obtenerProducto(venta.producto_id)
        return { ...venta, producto }
      })
    )

    return { success: true, data: ventasConProductos }
  } catch (error) {
    console.error('List ventas error:', error)
    return { error: 'Error al listar ventas' }
  }
}

/**
 * Delete/deactivate a product
 */
export async function eliminarProductoAction(productoId: string) {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const producto = await actualizarProducto(productoId, { activo: false })
    if (!producto) {
      return { error: 'Error al eliminar el producto' }
    }

    return { success: true, data: producto }
  } catch (error) {
    console.error('Producto deletion error:', error)
    return { error: 'Error al eliminar el producto' }
  }
}

/**
 * Load sample products for a veterinary clinic
 */
export async function cargarProductosMuestraAction() {
  try {
    const context = await getDbContext()
    if (!context) return { error: 'No autorizado' }

    const sampleProducts = [
      {
        nombre: 'Antibiótico Amoxicilina',
        descripcion: 'Antibiótico de amplio espectro para infecciones bacterianas',
        precio_venta: 250,
        precio_costo: 150,
        stock_cantidad: 50,
        unidad: 'unidad',
        categoria: 'Medicamentos',
        proveedor: 'LabVet S.A.',
      },
      {
        nombre: 'Analgésico Dipirona',
        descripcion: 'Analgésico antipirético para dolor e inflamación',
        precio_venta: 180,
        precio_costo: 100,
        stock_cantidad: 75,
        unidad: 'unidad',
        categoria: 'Medicamentos',
        proveedor: 'LabVet S.A.',
      },
      {
        nombre: 'Desparasitante Intestinal',
        descripcion: 'Efectivo contra parásitos intestinales',
        precio_venta: 320,
        precio_costo: 200,
        stock_cantidad: 40,
        unidad: 'unidad',
        categoria: 'Medicamentos',
        proveedor: 'Vetpharm',
      },
      {
        nombre: 'Shampoo Hipoalergénico',
        descripcion: 'Para pieles sensibles y alérgicas',
        precio_venta: 150,
        precio_costo: 80,
        stock_cantidad: 30,
        unidad: 'unidad',
        categoria: 'Accesorios',
        proveedor: 'PetCare',
      },
      {
        nombre: 'Alimento Balanceado Premium',
        descripcion: 'Alimento completo y balanceado para perros adultos',
        precio_venta: 800,
        precio_costo: 500,
        stock_cantidad: 20,
        unidad: 'kg',
        categoria: 'Alimentos',
        proveedor: 'NutriPet',
      },
      {
        nombre: 'Suero Fisiológico',
        descripcion: 'Solución fisiológica estéril para limpiezas',
        precio_venta: 120,
        precio_costo: 70,
        stock_cantidad: 100,
        unidad: 'ml',
        categoria: 'Medicamentos',
        proveedor: 'LabVet S.A.',
      },
      {
        nombre: 'Vacuna Polivalente (5 en 1)',
        descripcion: 'Protección contra 5 enfermedades virales',
        precio_venta: 450,
        precio_costo: 300,
        stock_cantidad: 15,
        unidad: 'dosis',
        categoria: 'Vacunas',
        proveedor: 'Vetpharm',
      },
      {
        nombre: 'Collar Antipulgas',
        descripcion: 'Protección de larga duración contra pulgas y garrapatas',
        precio_venta: 280,
        precio_costo: 150,
        stock_cantidad: 25,
        unidad: 'unidad',
        categoria: 'Accesorios',
        proveedor: 'PetCare',
      },
      {
        nombre: 'Suplemento Calcio + Fósforo',
        descripcion: 'Fortalecimiento óseo y dental',
        precio_venta: 350,
        precio_costo: 200,
        stock_cantidad: 35,
        unidad: 'unidad',
        categoria: 'Medicamentos',
        proveedor: 'VetSupplements',
      },
      {
        nombre: 'Consulta Veterinaria Básica',
        descripcion: 'Revisación clínica y diagnóstico inicial',
        precio_venta: 500,
        precio_costo: 0,
        stock_cantidad: 999,
        unidad: 'servicio',
        categoria: 'Servicios',
        proveedor: null,
      },
    ]

    const createdProducts = []
    for (const product of sampleProducts) {
      const result = await crearProductoAction(product)
      if (result.success && result.data) {
        createdProducts.push(result.data)
      }
    }

    return { success: true, data: createdProducts }
  } catch (error) {
    console.error('Sample products loading error:', error)
    return { error: 'Error al cargar productos de muestra' }
  }
}
