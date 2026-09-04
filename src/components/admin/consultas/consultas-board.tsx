'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Plus, Search, Trash2, ShoppingCart } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { createClient } from '@/lib/supabase/client'
import { listarVentasConsultaAction } from '@/app/admin/actions/productos'
import { VentaModal } from './venta-modal'

type ConsultaRow = {
  id: string
  cliente_id: string
  mascota_id: string
  diagnostico: string | null
  evaluacion: string | null
  creado_en: string
}

type ConsultaItem = {
  id: string
  cliente_id: string
  mascota_id: string
  cliente_nombre: string
  mascota_nombre: string
  diagnostico: string
  evaluacion: string
  creado_en: string
  ventasCount: number
}

export function ConsultasBoard() {
  const [items, setItems] = useState<ConsultaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string>()
  const [selectedConsultaId, setSelectedConsultaId] = useState<string | null>(null)
  const [ventasCount, setVentasCount] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const supabase = createClient()
      const { data, error: requestError } = await supabase
        .from('consultas')
        .select('id, cliente_id, mascota_id, diagnostico, evaluacion, creado_en')
        .order('creado_en', { ascending: false })
        .limit(100)

      if (requestError) throw requestError

      // Get client and mascota names
      const consultasWithDetails: ConsultaItem[] = await Promise.all(
        ((data || []) as ConsultaRow[]).map(async (consulta) => {
          const [clienteData, mascotaData] = await Promise.all([
            supabase.from('clientes').select('nombre, apellido').eq('id', consulta.cliente_id).single(),
            supabase.from('mascotas').select('nombre').eq('id', consulta.mascota_id).single(),
          ])

          const cliente_nombre = clienteData.data
            ? `${clienteData.data.nombre} ${clienteData.data.apellido}`
            : 'Desconocido'
          const mascota_nombre = mascotaData.data?.nombre || 'Desconocida'

          // Count ventas for this consulta
          const ventasResult = await listarVentasConsultaAction(consulta.id)
          const ventasCount = ventasResult.success && ventasResult.data ? ventasResult.data.length : 0

          return {
            id: consulta.id,
            cliente_id: consulta.cliente_id,
            mascota_id: consulta.mascota_id,
            cliente_nombre,
            mascota_nombre,
            diagnostico: consulta.diagnostico || 'Sin diagnóstico',
            evaluacion: consulta.evaluacion || '',
            creado_en: consulta.creado_en,
            ventasCount,
          }
        })
      )

      setItems(consultasWithDetails)

      // Count ventas by consulta
      const counts: Record<string, number> = {}
      consultasWithDetails.forEach((c) => {
        counts[c.id] = c.ventasCount
      })
      setVentasCount(counts)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cargar las consultas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(id: string) {
    if (!confirm('¿Querés eliminar esta consulta?')) return
    try {
      const supabase = createClient()
      const { error: requestError } = await supabase.from('consultas').update({ estado: 'Cancelada' }).eq('id', id)
      if (requestError) throw requestError
      setItems((current) => current.filter((item) => item.id !== id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos eliminar la consulta')
    }
  }

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        (
          item.cliente_nombre +
          ' ' +
          item.mascota_nombre +
          ' ' +
          item.diagnostico +
          ' ' +
          item.evaluacion
        )
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [items, query]
  )

  function exportCsv() {
    const rows = [
      ['Cliente', 'Mascota', 'Diagnóstico', 'Evaluación', 'Ventas', 'Creado'],
      ...items.map((item) => [
        item.cliente_nombre,
        item.mascota_nombre,
        item.diagnostico,
        item.evaluacion,
        ventasCount[item.id] || 0,
        item.creado_en,
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
    anchor.download = 'consultas.csv'
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold capitalize text-blue-600">Clínica</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Consultas</h1>
          <p className="mt-1 text-sm text-slate-500">Administrá consultas con búsqueda, estados y exportación.</p>
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
              placeholder="Buscar en consultas…"
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
            title={query ? 'No encontramos resultados' : 'Todavía no hay consultas'}
            description={query ? 'Probá con otros términos de búsqueda.' : 'Las consultas aparecerán aquí.'}
          />
        ) : (
          <div>
            {filtered.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[1.5fr_1fr_150px_80px_44px_44px] md:items-center"
              >
                <div>
                  <div className="font-semibold">{item.cliente_nombre}</div>
                  <div className="text-xs text-slate-500">{item.mascota_nombre}</div>
                </div>
                <div className="text-sm text-slate-600">{item.diagnostico}</div>
                <div className="text-xs text-slate-400">{new Intl.DateTimeFormat('es-AR').format(new Date(item.creado_en))}</div>
                <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                  <ShoppingCart size={14} />
                  {ventasCount[item.id] || 0}
                </div>
                <button
                  onClick={() => setSelectedConsultaId(item.id)}
                  className="justify-self-end rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                  aria-label="Registrar venta"
                >
                  <Plus size={17} />
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

      {selectedConsultaId && (
        <VentaModal
          consultaId={selectedConsultaId}
          clienteId={items.find((i) => i.id === selectedConsultaId)?.cliente_id || ''}
          onClose={() => {
            setSelectedConsultaId(null)
            void load()
          }}
          onVentaCreada={() => {
            void load()
          }}
        />
      )}
    </div>
  )
}
