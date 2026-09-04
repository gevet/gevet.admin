'use client'

import { useState, useEffect } from 'react'
import { X, ShoppingCart } from 'lucide-react'
import { crearVentaAction, listarProductosAction } from '@/app/admin/actions/productos'
import type { Producto, Venta } from '@/lib/types/database'

interface VentaModalProps {
  consultaId: string | null
  clienteId: string
  onClose: () => void
  onVentaCreada?: (venta: Venta) => void
}

export function VentaModal({ consultaId, clienteId, onClose, onVentaCreada }: VentaModalProps) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [carrito, setCarrito] = useState<(Producto & { cantidad: number; descuento: number })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState<'Contado' | 'Tarjeta' | 'Transferencia' | 'Cuenta Corriente'>('Contado')

  useEffect(() => {
    loadProductos()
  }, [])

  async function loadProductos() {
    const result = await listarProductosAction()
    if (result.success && result.data) {
      setProductos(result.data)
    }
  }

  function agregarProducto(producto: Producto) {
    const existente = carrito.find((p) => p.id === producto.id)
    if (existente) {
      setCarrito(carrito.map((p) => (p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p)))
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1, descuento: 0 }])
    }
    setError(null)
  }

  function removerProducto(productoId: string) {
    setCarrito(carrito.filter((p) => p.id !== productoId))
  }

  function actualizarCantidad(productoId: string, cantidad: number) {
    if (cantidad <= 0) {
      removerProducto(productoId)
    } else {
      setCarrito(carrito.map((p) => (p.id === productoId ? { ...p, cantidad } : p)))
    }
  }

  function actualizarDescuento(productoId: string, descuento: number) {
    setCarrito(carrito.map((p) => (p.id === productoId ? { ...p, descuento } : p)))
  }

  const subtotal = carrito.reduce((sum, p) => sum + p.precio_venta * p.cantidad, 0)
  const descuentoTotal = carrito.reduce((sum, p) => sum + (p.precio_venta * p.cantidad * p.descuento) / 100, 0)
  const total = subtotal - descuentoTotal

  async function registrarVentas() {
    if (carrito.length === 0) {
      setError('Agregar al menos un producto')
      return
    }

    setLoading(true)
    setError(null)

    try {
      for (const item of carrito) {
        const descuentoMonto = (item.precio_venta * item.cantidad * item.descuento) / 100
        const result = await crearVentaAction({
          consulta_id: consultaId,
          cliente_id: clienteId,
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_venta,
          descuento_porcentaje: item.descuento,
          descuento_monto: Math.round(descuentoMonto * 100) / 100,
          metodo_pago: metodoPago,
        })

        if (!result.success) {
          setError(result.error || 'Error al registrar venta')
          setLoading(false)
          return
        }

        if (result.data && onVentaCreada) {
          onVentaCreada(result.data)
        }
      }

      setCarrito([])
      onClose()
    } catch {
      setError('Error al registrar las ventas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <h2 className="text-lg font-bold">Registrar Ventas</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Productos disponibles */}
          <div>
            <h3 className="font-semibold mb-2">Productos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {productos.map((producto) => (
                <button
                  key={producto.id}
                  onClick={() => agregarProducto(producto)}
                  className="text-left p-2 border border-slate-200 dark:border-slate-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                >
                  <div className="font-medium text-sm">{producto.nombre}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    ${producto.precio_venta} (Stock: {producto.stock_cantidad})
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Carrito */}
          {carrito.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Carrito</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {carrito.map((item) => (
                  <div key={item.id} className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-sm">{item.nombre}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">${item.precio_venta} c/u</div>
                      </div>
                      <button
                        onClick={() => removerProducto(item.id)}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-1">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          max={item.stock_cantidad}
                          value={item.cantidad}
                          onChange={(e) => actualizarCantidad(item.id, parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-1">Desc %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.descuento}
                          onChange={(e) => actualizarDescuento(item.id, parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-1">Subtotal</label>
                        <div className="py-1 font-medium">${(item.precio_venta * item.cantidad).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium mb-2">Método de pago</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as Venta['metodo_pago'])}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
            >
              <option value="Contado">Contado</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Cuenta Corriente">Cuenta Corriente</option>
            </select>
          </div>

          {/* Totales */}
          {carrito.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2 text-red-600">
                <span>Descuento:</span>
                <span>-${descuentoTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-slate-300 dark:border-slate-600 pt-2">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {error && <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">{error}</div>}

          {/* Acciones */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={registrarVentas}
              disabled={loading || carrito.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              {loading ? 'Registrando...' : 'Registrar Ventas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
