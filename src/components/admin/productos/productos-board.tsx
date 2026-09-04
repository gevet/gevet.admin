'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Plus, Search, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { crearProductoAction, eliminarProductoAction, cargarProductosMuestraAction, listarProductosAction } from '@/app/admin/actions/productos'
import type { Producto } from '@/lib/types/database'

export function ProductosBoard() {
  const [items, setItems] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string>()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const result = await listarProductosAction()
      if (result.success && result.data) {
        setItems(result.data)
      } else {
        setError(result.error || 'No pudimos cargar los productos')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(undefined)

    const form = new FormData(event.currentTarget)
    try {
      const result = await crearProductoAction({
        nombre: String(form.get('nombre')),
        descripcion: form.get('descripcion') ? String(form.get('descripcion')) : null,
        precio_venta: parseFloat(String(form.get('precio_venta'))),
        precio_costo: form.get('precio_costo') ? parseFloat(String(form.get('precio_costo'))) : null,
        stock_cantidad: parseInt(String(form.get('stock_cantidad'))),
        unidad: String(form.get('unidad')) || 'Unidad',
        categoria: form.get('categoria') ? String(form.get('categoria')) : null,
        codigo_barras: form.get('codigo_barras') ? String(form.get('codigo_barras')) : null,
        proveedor: form.get('proveedor') ? String(form.get('proveedor')) : null,
      })

      if (result.success) {
        setOpen(false)
        await load()
      } else {
        setError(result.error || 'Error al guardar el producto')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al guardar el producto')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Querés eliminar este producto?')) return
    try {
      const result = await eliminarProductoAction(id)
      if (result.success) {
        setItems((current) => current.filter((item) => item.id !== id))
        setError(undefined)
      } else {
        setError(result.error || 'Error al eliminar el producto')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos eliminar el producto')
    }
  }

  async function cargarMuestra() {
    if (!confirm('¿Querés cargar 10 productos de muestra? Esto incluye medicinas, alimentos y servicios.'))
      return
    setSaving(true)
    setError(undefined)
    try {
      const result = await cargarProductosMuestraAction()
      if (result.success) {
        await load()
      } else {
        setError(result.error || 'Error al cargar productos de muestra')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al cargar productos de muestra')
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        (item.nombre + ' ' + (item.descripcion || '') + ' ' + (item.categoria || '')).toLowerCase().includes(query.toLowerCase())
      ),
    [items, query]
  )

  function exportCsv() {
    const rows = [
      ['Nombre', 'Descripción', 'Precio Venta', 'Precio Costo', 'Stock', 'Categoría', 'Proveedor'],
      ...items.map((item) => [
        item.nombre,
        item.descripcion || '',
        item.precio_venta,
        item.precio_costo || '',
        item.stock_cantidad,
        item.categoria || '',
        item.proveedor || '',
      ]),
    ]
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n')
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    anchor.download = 'productos.csv'
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold capitalize text-blue-600">Comercial</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Productos y servicios</h1>
          <p className="mt-1 text-sm text-slate-500">Administrá productos con búsqueda, precios y stock.</p>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && (
            <button
              onClick={cargarMuestra}
              disabled={saving}
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cargar muestra
            </button>
          )}
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} /> Nuevo producto
          </Button>
        </div>
      </div>
      {error && (
        <div role="alert" className="mt-5 flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button className="font-semibold" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      )}
      <Card className="mt-7 !p-0">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={18} className="text-slate-400" />
            <input
              aria-label="Buscar"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-11 flex-1 outline-none"
              placeholder="Buscar en productos…"
            />
          </label>
          <button
            onClick={exportCsv}
            disabled={!items.length}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold disabled:opacity-40"
          >
            <Download size={17} /> Exportar
          </button>
        </div>
        {loading ? (
          <div className="min-h-64 animate-pulse bg-slate-50" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? 'No encontramos resultados' : 'Todavía no hay productos'}
            description={query ? 'Probá con otros términos de búsqueda.' : 'Agregá tu primer producto para empezar.'}
            action={
              !query ? (
                <Button onClick={() => setOpen(true)}>
                  <Plus size={18} /> Crear producto
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div>
            {filtered.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[1.5fr_120px_120px_100px_80px_44px_44px] md:items-center"
              >
                <div>
                  <div className="font-semibold">{item.nombre}</div>
                  <div className="text-xs text-slate-500">{item.descripcion || 'Sin descripción'}</div>
                  {item.categoria && <div className="text-xs text-slate-400 mt-1">{item.categoria}</div>}
                </div>
                <div className="text-sm font-medium">${item.precio_venta.toFixed(2)}</div>
                <div className="text-sm text-slate-600">
                  {item.precio_costo ? `$${item.precio_costo.toFixed(2)}` : '—'}
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  <span className={item.stock_cantidad < 5 ? 'text-red-600' : ''}>
                    {item.stock_cantidad} {item.unidad}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{item.proveedor || '—'}</div>
                <button
                  onClick={() => setEditingId(item.id)}
                  className="justify-self-end rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                  aria-label="Editar"
                >
                  <Edit2 size={17} />
                </button>
                <button
                  onClick={() => void remove(item.id)}
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

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo producto">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">
            Nombre
            <input
              required
              name="nombre"
              autoFocus
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-medium">
            Descripción
            <textarea
              name="descripcion"
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-blue-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">
              Precio Venta
              <input
                required
                type="number"
                step="0.01"
                name="precio_venta"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Precio Costo
              <input
                type="number"
                step="0.01"
                name="precio_costo"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">
              Stock
              <input
                required
                type="number"
                name="stock_cantidad"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Unidad
              <select
                name="unidad"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              >
                <option>Unidad</option>
                <option>mg</option>
                <option>ml</option>
                <option>cc</option>
                <option>kg</option>
                <option>g</option>
                <option>l</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">
              Categoría
              <input
                name="categoria"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Proveedor
              <input
                name="proveedor"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Código de barras
            <input
              name="codigo_barras"
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <Button disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
