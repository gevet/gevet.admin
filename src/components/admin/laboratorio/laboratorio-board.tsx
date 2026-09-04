'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, FlaskConical, AlertTriangle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import {
  crearEstudioAction,
  listarEstudiosAction,
  crearOrdenLaboratorioAction,
  listarOrdenesLaboratorioAction,
  obtenerOrdenLaboratorioAction,
  cargarResultadoAction,
  actualizarEstadoOrdenLaboratorioAction,
  cargarEstudiosBaseAction,
} from '@/app/admin/actions/laboratorio'
import type { EstudioLaboratorio, OrdenLaboratorio } from '@/lib/types/database'

type OrdenConDatos = OrdenLaboratorio & {
  mascotas: { nombre: string; especie: string } | null
  clientes: { nombre: string; apellido: string } | null
}

type ItemConEstudio = {
  id: string
  estudio_id: string
  precio: number
  resultado: string | null
  valor_numerico: number | null
  unidad: string | null
  fuera_de_rango: boolean | null
  fecha_resultado: string | null
  estudios_laboratorio: {
    nombre: string
    unidad: string | null
    valor_referencia_min: number | null
    valor_referencia_max: number | null
  } | null
}

type MascotaOpcion = { id: string; nombre: string; cliente_id: string; especie: string }

const ESTADO_COLOR: Record<string, string> = {
  Solicitada: 'bg-blue-100 text-blue-700',
  'En Proceso': 'bg-amber-100 text-amber-700',
  Completada: 'bg-emerald-100 text-emerald-700',
  Cancelada: 'bg-red-100 text-red-700',
}

export function LaboratorioBoard() {
  const [tab, setTab] = useState<'ordenes' | 'estudios'>('ordenes')
  const [estudios, setEstudios] = useState<EstudioLaboratorio[]>([])
  const [ordenes, setOrdenes] = useState<OrdenConDatos[]>([])
  const [mascotas, setMascotas] = useState<MascotaOpcion[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [modalEstudio, setModalEstudio] = useState(false)
  const [modalOrden, setModalOrden] = useState(false)
  const [ordenAbierta, setOrdenAbierta] = useState<{ orden: OrdenConDatos; items: ItemConEstudio[] } | null>(null)
  const [mascotaSel, setMascotaSel] = useState('')
  const [estudiosSel, setEstudiosSel] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [e, o, m] = await Promise.all([
      listarEstudiosAction(),
      listarOrdenesLaboratorioAction(),
      supabase.from('mascotas').select('id, nombre, cliente_id, especie').eq('activo', true).order('nombre'),
    ])
    if (e.success && e.data) setEstudios(e.data)
    if (o.success && o.data) setOrdenes(o.data as OrdenConDatos[])
    if (m.data) setMascotas(m.data as MascotaOpcion[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function guardarEstudio(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(undefined)
    const form = new FormData(event.currentTarget)
    const min = form.get('valor_referencia_min')
    const max = form.get('valor_referencia_max')
    const result = await crearEstudioAction({
      nombre: String(form.get('nombre')),
      categoria: String(form.get('categoria') || ''),
      precio: parseFloat(String(form.get('precio')) || '0'),
      unidad: String(form.get('unidad') || ''),
      valor_referencia_min: min ? parseFloat(String(min)) : null,
      valor_referencia_max: max ? parseFloat(String(max)) : null,
      tiempo_entrega_horas: parseInt(String(form.get('tiempo_entrega_horas')) || '24'),
    })
    if (result.success) {
      setModalEstudio(false)
      await load()
    } else {
      setError(result.error)
    }
    setSaving(false)
  }

  async function guardarOrden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const mascota = mascotas.find((m) => m.id === mascotaSel)
    if (!mascota) {
      setError('Seleccioná una mascota')
      return
    }
    if (estudiosSel.length === 0) {
      setError('Seleccioná al menos un estudio')
      return
    }
    setSaving(true)
    setError(undefined)
    const form = new FormData(event.currentTarget)
    const result = await crearOrdenLaboratorioAction({
      cliente_id: mascota.cliente_id,
      mascota_id: mascota.id,
      prioridad: String(form.get('prioridad')) as 'Normal' | 'Urgente',
      observaciones: String(form.get('observaciones') || ''),
      estudios: estudiosSel,
    })
    if (result.success) {
      setModalOrden(false)
      setMascotaSel('')
      setEstudiosSel([])
      await load()
    } else {
      setError(result.error)
    }
    setSaving(false)
  }

  async function abrirOrden(ordenId: string) {
    const result = await obtenerOrdenLaboratorioAction(ordenId)
    if (result.success && result.data) {
      setOrdenAbierta({
        orden: result.data.orden as OrdenConDatos,
        items: result.data.items as ItemConEstudio[],
      })
    } else {
      setError(result.error)
    }
  }

  async function guardarResultado(itemId: string, valor: string, texto: string) {
    const numero = parseFloat(valor)
    const result = await cargarResultadoAction({
      item_id: itemId,
      resultado: texto || null,
      valor_numerico: Number.isFinite(numero) ? numero : null,
    })
    if (result.success && ordenAbierta) {
      await abrirOrden(ordenAbierta.orden.id)
      await load()
    } else if (!result.success) {
      setError(result.error)
    }
  }

  async function cambiarEstado(ordenId: string, estado: OrdenLaboratorio['estado']) {
    const result = await actualizarEstadoOrdenLaboratorioAction(ordenId, estado)
    if (result.success) {
      await load()
      if (ordenAbierta?.orden.id === ordenId) await abrirOrden(ordenId)
    } else {
      setError(result.error)
    }
  }

  async function cargarBase() {
    if (!confirm('¿Cargar el catálogo base? Se agregan 14 estudios veterinarios frecuentes.')) return
    setSaving(true)
    const result = await cargarEstudiosBaseAction()
    if (result.success) await load()
    else setError(result.error)
    setSaving(false)
  }

  const ordenesFiltradas = useMemo(
    () =>
      ordenes.filter((o) =>
        `${o.numero} ${o.mascotas?.nombre ?? ''} ${o.clientes?.apellido ?? ''} ${o.estado}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [ordenes, query],
  )

  const estudiosFiltrados = useMemo(
    () =>
      estudios.filter((e) => `${e.nombre} ${e.categoria ?? ''}`.toLowerCase().includes(query.toLowerCase())),
    [estudios, query],
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Clínica</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Laboratorio</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catálogo de estudios, órdenes de análisis y carga de resultados con valores de referencia.
          </p>
        </div>
        <div className="flex gap-2">
          {estudios.length === 0 && (
            <button
              onClick={cargarBase}
              disabled={saving}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cargar catálogo base
            </button>
          )}
          <Button onClick={() => (tab === 'estudios' ? setModalEstudio(true) : setModalOrden(true))}>
            <Plus size={18} /> {tab === 'estudios' ? 'Nuevo estudio' : 'Nueva orden'}
          </Button>
        </div>
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
        {([
          ['ordenes', `Órdenes (${ordenes.length})`],
          ['estudios', `Estudios (${estudios.length})`],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold transition ${
              tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
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
              placeholder={tab === 'ordenes' ? 'Buscar órdenes…' : 'Buscar estudios…'}
            />
          </label>
        </div>

        {loading ? (
          <div className="min-h-64 animate-pulse bg-slate-50" />
        ) : tab === 'ordenes' ? (
          ordenesFiltradas.length === 0 ? (
            <EmptyState
              title="Todavía no hay órdenes de laboratorio"
              description="Creá una orden para pedir análisis de un paciente y cargar sus resultados."
              action={<Button onClick={() => setModalOrden(true)}><Plus size={18} /> Nueva orden</Button>}
            />
          ) : (
            <div>
              {ordenesFiltradas.map((o) => (
                <div
                  key={o.id}
                  className="grid gap-3 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[70px_1.5fr_110px_120px_1fr] md:items-center"
                >
                  <div className="font-mono text-sm font-semibold text-slate-500">#{o.numero}</div>
                  <div>
                    <div className="font-semibold">{o.mascotas?.nombre ?? 'Paciente'}</div>
                    <div className="text-xs text-slate-500">
                      {o.clientes ? `${o.clientes.nombre} ${o.clientes.apellido}` : ''} ·{' '}
                      {new Intl.DateTimeFormat('es-AR').format(new Date(o.fecha))}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">${Number(o.total).toFixed(2)}</div>
                  <div className="flex flex-wrap gap-1">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_COLOR[o.estado]}`}>
                      {o.estado}
                    </span>
                    {o.prioridad === 'Urgente' && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                        Urgente
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => void abrirOrden(o.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      <FlaskConical size={14} /> Resultados
                    </button>
                    {o.estado === 'Solicitada' && (
                      <button
                        onClick={() => void cambiarEstado(o.id, 'En Proceso')}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        Procesar
                      </button>
                    )}
                    {o.estado === 'En Proceso' && (
                      <button
                        onClick={() => void cambiarEstado(o.id, 'Completada')}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Completar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : estudiosFiltrados.length === 0 ? (
          <EmptyState
            title="No hay estudios cargados"
            description="Cargá el catálogo base o creá los estudios que hace tu laboratorio."
            action={
              <button
                onClick={cargarBase}
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primario)] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Cargar catálogo base
              </button>
            }
          />
        ) : (
          <div>
            {estudiosFiltrados.map((e) => (
              <div
                key={e.id}
                className="grid gap-2 border-b border-slate-100 p-4 last:border-0 md:grid-cols-[1.5fr_1fr_140px_100px] md:items-center"
              >
                <div className="font-medium">{e.nombre}</div>
                <div className="text-sm text-slate-500">{e.categoria || '—'}</div>
                <div className="text-xs text-slate-500">
                  {e.valor_referencia_min !== null || e.valor_referencia_max !== null
                    ? `Ref: ${e.valor_referencia_min ?? '—'} a ${e.valor_referencia_max ?? '—'} ${e.unidad ?? ''}`
                    : 'Cualitativo'}
                </div>
                <div className="font-semibold">${Number(e.precio).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalEstudio} onClose={() => setModalEstudio(false)} title="Nuevo estudio">
        <form onSubmit={guardarEstudio} className="space-y-4">
          <label className="block text-sm font-medium">
            Nombre
            <input
              name="nombre"
              required
              autoFocus
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">
              Categoría
              <input
                name="categoria"
                placeholder="Hematología"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Precio
              <input
                name="precio"
                type="number"
                step="0.01"
                min="0"
                required
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <label className="block text-sm font-medium">
              Unidad
              <input
                name="unidad"
                placeholder="mg/dL"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Ref. mín
              <input
                name="valor_referencia_min"
                type="number"
                step="0.001"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Ref. máx
              <input
                name="valor_referencia_max"
                type="number"
                step="0.001"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Tiempo de entrega (horas)
            <input
              name="tiempo_entrega_horas"
              type="number"
              min="1"
              defaultValue={24}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalEstudio(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <Button disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={modalOrden} onClose={() => setModalOrden(false)} title="Nueva orden de laboratorio">
        <form onSubmit={guardarOrden} className="space-y-4">
          <label className="block text-sm font-medium">
            Paciente
            <select
              value={mascotaSel}
              onChange={(e) => setMascotaSel(e.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
            >
              <option value="">Seleccioná un paciente…</option>
              {mascotas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.especie})
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-sm font-medium">Estudios solicitados</p>
            <div className="mt-1.5 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {estudios.length === 0 ? (
                <p className="p-2 text-xs text-slate-500">Cargá primero el catálogo de estudios.</p>
              ) : (
                estudios.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={estudiosSel.includes(e.id)}
                      onChange={(ev) =>
                        setEstudiosSel(
                          ev.target.checked
                            ? [...estudiosSel, e.id]
                            : estudiosSel.filter((x) => x !== e.id),
                        )
                      }
                      className="h-4 w-4"
                    />
                    <span className="flex-1">{e.nombre}</span>
                    <span className="text-xs text-slate-500">${Number(e.precio).toFixed(2)}</span>
                  </label>
                ))
              )}
            </div>
            {estudiosSel.length > 0 && (
              <p className="mt-2 text-right text-sm font-semibold">
                Total: $
                {estudios
                  .filter((e) => estudiosSel.includes(e.id))
                  .reduce((s, e) => s + Number(e.precio), 0)
                  .toFixed(2)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">
              Prioridad
              <select
                name="prioridad"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              >
                <option>Normal</option>
                <option>Urgente</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Observaciones
              <input
                name="observaciones"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOrden(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <Button disabled={saving}>{saving ? 'Guardando…' : 'Crear orden'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={ordenAbierta !== null}
        onClose={() => setOrdenAbierta(null)}
        title={ordenAbierta ? `Resultados — Orden #${ordenAbierta.orden.numero}` : 'Resultados'}
      >
        {ordenAbierta && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-semibold">{ordenAbierta.orden.mascotas?.nombre}</p>
              <p className="text-slate-500">
                {ordenAbierta.orden.clientes
                  ? `${ordenAbierta.orden.clientes.nombre} ${ordenAbierta.orden.clientes.apellido}`
                  : ''}
              </p>
            </div>

            <div className="space-y-3">
              {ordenAbierta.items.map((item) => (
                <ResultadoRow key={item.id} item={item} onGuardar={guardarResultado} />
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ResultadoRow({
  item,
  onGuardar,
}: {
  item: ItemConEstudio
  onGuardar: (itemId: string, valor: string, texto: string) => Promise<void>
}) {
  const [valor, setValor] = useState(item.valor_numerico?.toString() ?? '')
  const [texto, setTexto] = useState(item.resultado ?? '')
  const [guardando, setGuardando] = useState(false)

  const estudio = item.estudios_laboratorio
  const esCuantitativo =
    (estudio?.valor_referencia_min ?? null) !== null || (estudio?.valor_referencia_max ?? null) !== null

  async function guardar() {
    setGuardando(true)
    await onGuardar(item.id, valor, texto)
    setGuardando(false)
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{estudio?.nombre ?? 'Estudio'}</span>
        {item.fuera_de_rango === true && (
          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            <AlertTriangle size={12} /> Fuera de rango
          </span>
        )}
        {item.fuera_de_rango === false && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <Check size={12} /> Normal
          </span>
        )}
      </div>

      {esCuantitativo && (
        <p className="mb-2 text-xs text-slate-500">
          Referencia: {estudio?.valor_referencia_min ?? '—'} a {estudio?.valor_referencia_max ?? '—'}{' '}
          {estudio?.unidad ?? ''}
        </p>
      )}

      <div className="grid grid-cols-[110px_1fr_auto] gap-2">
        <input
          type="number"
          step="0.001"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor"
          className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
          aria-label={`Valor de ${estudio?.nombre ?? 'estudio'}`}
        />
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Resultado / observación"
          className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
          aria-label={`Resultado de ${estudio?.nombre ?? 'estudio'}`}
        />
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {guardando ? '…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
