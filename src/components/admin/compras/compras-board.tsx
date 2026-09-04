'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2, Truck, PackageCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import {
  crearProveedorAction,
  listarProveedoresAction,
  eliminarProveedorAction,
  crearOrdenCompraAction,
  listarOrdenesCompraAction,
  actualizarEstadoOrdenCompraAction,
} from '@/app/admin/actions/compras'
import { listarProductosAction } from '@/app/admin/actions/productos'
import type { Proveedor, OrdenCompra, Producto } from '@/lib/types/database'

type OrdenConProveedor = OrdenCompra & { proveedores: { razon_social: string } | null }
type LineaOrden = { producto_id: string; nombre: string; cantidad: number; precio_unitario: number }

const ESTADO_COLOR: Record<string, string> = {
  Borrador: 'bg-slate-100 text-slate-700',
  Enviada: 'bg-blue-100 text-blue-700',
  'Recibida Parcial': 'bg-amber-100 text-amber-700',
  Recibida: 'bg-emerald-100 text-emerald-700',
  Cancelada: 'bg-red-100 text-red-700',
}

export function ComprasBoard() {
  const [tab, setTab] = useState<'ordenes' | 'proveedores'>('ordenes')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [ordenes, setOrdenes] = useState<OrdenConProveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [modalProveedor, setModalProveedor] = useState(false)
  const [modalOrden, setModalOrden] = useState(false)
  const [lineas, setLineas] = useState<LineaOrden[]>([])
  const [proveedorSel, setProveedorSel] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    const [prov, ord, prod] = await Promise.all([
      listarProveedoresAction(),
      listarOrdenesCompraAction(),
      listarProductosAction(),
    ])
    if (prov.success && prov.data) setProveedores(prov.data)
    if (ord.success && ord.data) setOrdenes(ord.data)
    if (prod.success && prod.data) setProductos(prod.data)
    if (!prov.success) setError(prov.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function guardarProveedor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(undefined)
    const form = new FormData(event.currentTarget)
    const result = await crearProveedorAction({
      razon_social: String(form.get('razon_social')),
      nombre_fantasia: String(form.get('nombre_fantasia') || ''),
      cuit: String(form.get('cuit') || ''),
      email: String(form.get('email') || ''),
      telefono: String(form.get('telefono') || ''),
      direccion: String(form.get('direccion') || ''),
      ciudad: String(form.get('ciudad') || ''),
      provincia: String(form.get('provincia') || ''),
      contacto: String(form.get('contacto') || ''),
      condicion_pago: String(form.get('condicion_pago') || 'Contado'),
    })
    if (result.success) {
      setModalProveedor(false)
      await load()
    } else {
      setError(result.error)
    }
    setSaving(false)
  }

  async function guardarOrden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!proveedorSel) {
      setError('Seleccioná un proveedor')
      return
    }
    if (lineas.length === 0) {
      setError('Agregá al menos un producto')
      return
    }
    setSaving(true)
    setError(undefined)
    const form = new FormData(event.currentTarget)
    const result = await crearOrdenCompraAction({
      proveedor_id: proveedorSel,
      fecha_entrega_estimada: String(form.get('fecha_entrega') || '') || null,
      observaciones: String(form.get('observaciones') || ''),
      items: lineas.map((l) => ({
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
      })),
    })
    if (result.success) {
      setModalOrden(false)
      setLineas([])
      setProveedorSel('')
      await load()
    } else {
      setError(result.error)
    }
    setSaving(false)
  }

  async function cambiarEstado(ordenId: string, estado: OrdenCompra['estado']) {
    const mensaje =
      estado === 'Recibida'
        ? '¿Confirmás la recepción? Se va a sumar el stock de todos los productos de la orden.'
        : `¿Cambiar el estado a "${estado}"?`
    if (!confirm(mensaje)) return
    const result = await actualizarEstadoOrdenCompraAction(ordenId, estado)
    if (result.success) await load()
    else setError(result.error)
  }

  async function borrarProveedor(id: string) {
    if (!confirm('¿Eliminar este proveedor?')) return
    const result = await eliminarProveedorAction(id)
    if (result.success) setProveedores((p) => p.filter((x) => x.id !== id))
    else setError(result.error)
  }

  function agregarLinea(producto: Producto) {
    const existe = lineas.find((l) => l.producto_id === producto.id)
    if (existe) {
      setLineas(lineas.map((l) => (l.producto_id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l)))
    } else {
      setLineas([
        ...lineas,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          cantidad: 1,
          precio_unitario: producto.precio_costo ?? producto.precio_venta,
        },
      ])
    }
  }

  const totalOrden = lineas.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0)

  const ordenesFiltradas = useMemo(
    () =>
      ordenes.filter((o) =>
        `${o.numero} ${o.proveedores?.razon_social ?? ''} ${o.estado}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [ordenes, query],
  )

  const proveedoresFiltrados = useMemo(
    () =>
      proveedores.filter((p) =>
        `${p.razon_social} ${p.cuit ?? ''} ${p.ciudad ?? ''}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [proveedores, query],
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Comercial</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Compras</h1>
          <p className="mt-1 text-sm text-slate-500">
            Proveedores, órdenes de compra y recepción de mercadería con actualización de stock.
          </p>
        </div>
        <Button onClick={() => (tab === 'ordenes' ? setModalOrden(true) : setModalProveedor(true))}>
          <Plus size={18} /> {tab === 'ordenes' ? 'Nueva orden' : 'Nuevo proveedor'}
        </Button>
      </div>

      {error && (
        <div role="alert" className="mt-5 flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button className="font-semibold" onClick={() => setError(undefined)}>
            Cerrar
          </button>
        </div>
      )}

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        {(['ordenes', 'proveedores'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold transition ${
              tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'ordenes' ? `Órdenes (${ordenes.length})` : `Proveedores (${proveedores.length})`}
          </button>
        ))}
      </div>

      <Card className="mt-5 !p-0">
        <div className="border-b border-slate-200 p-4">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={18} className="text-slate-400" />
            <input
              aria-label="Buscar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-11 flex-1 outline-none"
              placeholder={tab === 'ordenes' ? 'Buscar órdenes…' : 'Buscar proveedores…'}
            />
          </label>
        </div>

        {loading ? (
          <div className="min-h-64 animate-pulse bg-slate-50" />
        ) : tab === 'ordenes' ? (
          ordenesFiltradas.length === 0 ? (
            <EmptyState
              title="Todavía no hay órdenes de compra"
              description="Creá una orden para pedirle mercadería a un proveedor. Al recibirla, el stock se actualiza solo."
              action={<Button onClick={() => setModalOrden(true)}><Plus size={18} /> Nueva orden</Button>}
            />
          ) : (
            <div>
              {ordenesFiltradas.map((o) => (
                <div
                  key={o.id}
                  className="grid gap-3 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[80px_1.5fr_120px_140px_1fr] md:items-center"
                >
                  <div className="font-mono text-sm font-semibold text-slate-500">#{o.numero}</div>
                  <div>
                    <div className="font-semibold">{o.proveedores?.razon_social ?? 'Proveedor'}</div>
                    <div className="text-xs text-slate-500">
                      {new Intl.DateTimeFormat('es-AR').format(new Date(o.fecha))}
                    </div>
                  </div>
                  <div className="font-semibold">${Number(o.total).toFixed(2)}</div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_COLOR[o.estado]}`}>
                      {o.estado}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {o.estado === 'Borrador' && (
                      <button
                        onClick={() => void cambiarEstado(o.id, 'Enviada')}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        <Truck size={14} /> Enviar
                      </button>
                    )}
                    {(o.estado === 'Enviada' || o.estado === 'Recibida Parcial') && (
                      <button
                        onClick={() => void cambiarEstado(o.id, 'Recibida')}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <PackageCheck size={14} /> Recibir
                      </button>
                    )}
                    {o.estado !== 'Recibida' && o.estado !== 'Cancelada' && (
                      <button
                        onClick={() => void cambiarEstado(o.id, 'Cancelada')}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : proveedoresFiltrados.length === 0 ? (
          <EmptyState
            title="Todavía no hay proveedores"
            description="Cargá tus proveedores para poder generar órdenes de compra."
            action={<Button onClick={() => setModalProveedor(true)}><Plus size={18} /> Nuevo proveedor</Button>}
          />
        ) : (
          <div>
            {proveedoresFiltrados.map((p) => (
              <div
                key={p.id}
                className="grid gap-2 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[1.5fr_1fr_1fr_120px_44px] md:items-center"
              >
                <div>
                  <div className="font-semibold">{p.razon_social}</div>
                  {p.nombre_fantasia && <div className="text-xs text-slate-500">{p.nombre_fantasia}</div>}
                </div>
                <div className="text-sm text-slate-600">{p.cuit || '—'}</div>
                <div className="text-sm text-slate-600">{p.telefono || p.email || '—'}</div>
                <div className="text-xs text-slate-500">{p.condicion_pago}</div>
                <button
                  onClick={() => void borrarProveedor(p.id)}
                  className="justify-self-end rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Eliminar"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalProveedor} onClose={() => setModalProveedor(false)} title="Nuevo proveedor">
        <form onSubmit={guardarProveedor} className="space-y-4">
          <Field name="razon_social" label="Razón social" required autoFocus />
          <div className="grid grid-cols-2 gap-4">
            <Field name="nombre_fantasia" label="Nombre de fantasía" />
            <Field name="cuit" label="CUIT" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field name="email" label="Email" type="email" />
            <Field name="telefono" label="Teléfono" />
          </div>
          <Field name="direccion" label="Dirección" />
          <div className="grid grid-cols-2 gap-4">
            <Field name="ciudad" label="Ciudad" />
            <Field name="provincia" label="Provincia" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field name="contacto" label="Contacto" />
            <label className="block text-sm font-medium">
              Condición de pago
              <select
                name="condicion_pago"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              >
                <option>Contado</option>
                <option>Plazo 7</option>
                <option>Plazo 15</option>
                <option>Plazo 30</option>
                <option>Plazo 60</option>
              </select>
            </label>
          </div>
          <FormActions saving={saving} onCancel={() => setModalProveedor(false)} />
        </form>
      </Modal>

      <Modal open={modalOrden} onClose={() => setModalOrden(false)} title="Nueva orden de compra">
        <form onSubmit={guardarOrden} className="space-y-4">
          <label className="block text-sm font-medium">
            Proveedor
            <select
              value={proveedorSel}
              onChange={(e) => setProveedorSel(e.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
            >
              <option value="">Seleccioná un proveedor…</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razon_social}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-sm font-medium">Productos a pedir</p>
            <div className="mt-1.5 grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {productos.length === 0 ? (
                <p className="col-span-2 p-2 text-xs text-slate-500">
                  Cargá productos primero desde Productos y servicios.
                </p>
              ) : (
                productos.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => agregarLinea(p)}
                    className="rounded-lg border border-slate-200 p-2 text-left text-xs hover:bg-blue-50"
                  >
                    <span className="block font-medium">{p.nombre}</span>
                    <span className="text-slate-500">Stock: {p.stock_cantidad}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {lineas.length > 0 && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              {lineas.map((l) => (
                <div key={l.producto_id} className="grid grid-cols-[1fr_70px_90px_28px] items-center gap-2 text-sm">
                  <span className="truncate font-medium">{l.nombre}</span>
                  <input
                    type="number"
                    min="1"
                    value={l.cantidad}
                    onChange={(e) =>
                      setLineas(
                        lineas.map((x) =>
                          x.producto_id === l.producto_id
                            ? { ...x, cantidad: Math.max(1, parseInt(e.target.value) || 1) }
                            : x,
                        ),
                      )
                    }
                    className="min-h-9 rounded-lg border border-slate-300 px-2"
                    aria-label={`Cantidad de ${l.nombre}`}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.precio_unitario}
                    onChange={(e) =>
                      setLineas(
                        lineas.map((x) =>
                          x.producto_id === l.producto_id
                            ? { ...x, precio_unitario: parseFloat(e.target.value) || 0 }
                            : x,
                        ),
                      )
                    }
                    className="min-h-9 rounded-lg border border-slate-300 px-2"
                    aria-label={`Precio de ${l.nombre}`}
                  />
                  <button
                    type="button"
                    onClick={() => setLineas(lineas.filter((x) => x.producto_id !== l.producto_id))}
                    className="rounded p-1 text-slate-400 hover:text-red-600"
                    aria-label={`Quitar ${l.nombre}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span>Total</span>
                <span>${totalOrden.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field name="fecha_entrega" label="Entrega estimada" type="date" />
            <Field name="observaciones" label="Observaciones" />
          </div>
          <FormActions saving={saving} onCancel={() => setModalOrden(false)} />
        </form>
      </Modal>
    </div>
  )
}

function Field({
  name,
  label,
  type = 'text',
  required,
  autoFocus,
}: {
  name: string
  label: string
  type?: string
  required?: boolean
  autoFocus?: boolean
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoFocus={autoFocus}
        className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
      />
    </label>
  )
}

function FormActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
      >
        Cancelar
      </button>
      <Button disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
    </div>
  )
}
