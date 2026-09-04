'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, X, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import {
  crearCuentaAction,
  listarCuentasAction,
  crearAsientoAction,
  listarAsientosAction,
  obtenerBalanceSumasYSaldosAction,
  cargarPlanCuentasBaseAction,
} from '@/app/admin/actions/contabilidad'
import type { CuentaContable, AsientoContable } from '@/lib/types/database'

type LineaAsiento = { cuenta_id: string; debe: number; haber: number; descripcion: string }
type FilaBalance = { cuenta: CuentaContable; debe: number; haber: number; saldo: number }

const TIPO_COLOR: Record<string, string> = {
  Activo: 'bg-blue-100 text-blue-700',
  Pasivo: 'bg-amber-100 text-amber-700',
  Patrimonio: 'bg-violet-100 text-violet-700',
  Ingreso: 'bg-emerald-100 text-emerald-700',
  Egreso: 'bg-red-100 text-red-700',
}

export function ContabilidadBoard() {
  const [tab, setTab] = useState<'diario' | 'cuentas' | 'balance'>('diario')
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [asientos, setAsientos] = useState<AsientoContable[]>([])
  const [balance, setBalance] = useState<FilaBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [modalCuenta, setModalCuenta] = useState(false)
  const [modalAsiento, setModalAsiento] = useState(false)
  const [lineas, setLineas] = useState<LineaAsiento[]>([
    { cuenta_id: '', debe: 0, haber: 0, descripcion: '' },
    { cuenta_id: '', debe: 0, haber: 0, descripcion: '' },
  ])

  const load = useCallback(async () => {
    setLoading(true)
    const [c, a, b] = await Promise.all([
      listarCuentasAction(),
      listarAsientosAction(),
      obtenerBalanceSumasYSaldosAction(),
    ])
    if (c.success && c.data) setCuentas(c.data)
    if (a.success && a.data) setAsientos(a.data)
    if (b.success && b.data) setBalance(b.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function guardarCuenta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(undefined)
    const form = new FormData(event.currentTarget)
    const result = await crearCuentaAction({
      codigo: String(form.get('codigo')),
      nombre: String(form.get('nombre')),
      tipo: String(form.get('tipo')) as CuentaContable['tipo'],
      imputable: true,
    })
    if (result.success) {
      setModalCuenta(false)
      await load()
    } else {
      setError(result.error)
    }
    setSaving(false)
  }

  async function guardarAsiento(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(undefined)
    const form = new FormData(event.currentTarget)
    const result = await crearAsientoAction({
      fecha: String(form.get('fecha')),
      descripcion: String(form.get('descripcion')),
      lineas: lineas
        .filter((l) => l.cuenta_id && (l.debe > 0 || l.haber > 0))
        .map((l) => ({
          cuenta_id: l.cuenta_id,
          debe: l.debe,
          haber: l.haber,
          descripcion: l.descripcion || null,
        })),
    })
    if (result.success) {
      setModalAsiento(false)
      setLineas([
        { cuenta_id: '', debe: 0, haber: 0, descripcion: '' },
        { cuenta_id: '', debe: 0, haber: 0, descripcion: '' },
      ])
      await load()
    } else {
      setError(result.error)
    }
    setSaving(false)
  }

  async function cargarPlanBase() {
    if (!confirm('¿Cargar el plan de cuentas base? Se agregan 18 cuentas típicas de una veterinaria.')) return
    setSaving(true)
    const result = await cargarPlanCuentasBaseAction()
    if (result.success) await load()
    else setError(result.error)
    setSaving(false)
  }

  const totalDebe = lineas.reduce((s, l) => s + (l.debe || 0), 0)
  const totalHaber = lineas.reduce((s, l) => s + (l.haber || 0), 0)
  const balanceado = Math.abs(totalDebe - totalHaber) < 0.01 && totalDebe > 0

  const cuentasFiltradas = useMemo(
    () => cuentas.filter((c) => `${c.codigo} ${c.nombre} ${c.tipo}`.toLowerCase().includes(query.toLowerCase())),
    [cuentas, query],
  )
  const asientosFiltrados = useMemo(
    () => asientos.filter((a) => `${a.numero} ${a.descripcion}`.toLowerCase().includes(query.toLowerCase())),
    [asientos, query],
  )

  const totalesBalance = useMemo(
    () => ({
      debe: balance.reduce((s, f) => s + f.debe, 0),
      haber: balance.reduce((s, f) => s + f.haber, 0),
    }),
    [balance],
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Comercial</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Contabilidad</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plan de cuentas, libro diario con asientos balanceados y balance de sumas y saldos.
          </p>
        </div>
        <div className="flex gap-2">
          {cuentas.length === 0 && (
            <button
              onClick={cargarPlanBase}
              disabled={saving}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cargar plan base
            </button>
          )}
          <Button onClick={() => (tab === 'cuentas' ? setModalCuenta(true) : setModalAsiento(true))}>
            <Plus size={18} /> {tab === 'cuentas' ? 'Nueva cuenta' : 'Nuevo asiento'}
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
          ['diario', `Libro diario (${asientos.length})`],
          ['cuentas', `Plan de cuentas (${cuentas.length})`],
          ['balance', 'Sumas y saldos'],
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
        {tab !== 'balance' && (
          <div className="border-b border-slate-200 p-4">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
              <Search size={18} className="text-slate-400" />
              <input
                aria-label="Buscar"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-11 flex-1 outline-none"
                placeholder={tab === 'diario' ? 'Buscar asientos…' : 'Buscar cuentas…'}
              />
            </label>
          </div>
        )}

        {loading ? (
          <div className="min-h-64 animate-pulse bg-slate-50" />
        ) : tab === 'diario' ? (
          asientosFiltrados.length === 0 ? (
            <EmptyState
              title="El libro diario está vacío"
              description="Registrá tu primer asiento contable. El sistema valida que el debe sea igual al haber."
              action={<Button onClick={() => setModalAsiento(true)}><Plus size={18} /> Nuevo asiento</Button>}
            />
          ) : (
            <div>
              {asientosFiltrados.map((a) => (
                <div
                  key={a.id}
                  className="grid gap-2 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[70px_110px_1fr_120px_120px] md:items-center"
                >
                  <div className="font-mono text-sm font-semibold text-slate-500">#{a.numero}</div>
                  <div className="text-sm text-slate-600">
                    {new Intl.DateTimeFormat('es-AR').format(new Date(a.fecha))}
                  </div>
                  <div className="font-medium">{a.descripcion}</div>
                  <div className="text-sm">
                    <span className="text-slate-500">Debe </span>
                    <span className="font-semibold">${Number(a.total_debe).toFixed(2)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500">Haber </span>
                    <span className="font-semibold">${Number(a.total_haber).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'cuentas' ? (
          cuentasFiltradas.length === 0 ? (
            <EmptyState
              title="No hay cuentas cargadas"
              description="Cargá el plan de cuentas base o creá las cuentas que necesites."
              action={
                <button
                  onClick={cargarPlanBase}
                  className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primario)] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Cargar plan base
                </button>
              }
            />
          ) : (
            <div>
              {cuentasFiltradas.map((c) => (
                <div
                  key={c.id}
                  className="grid gap-2 border-b border-slate-100 p-4 last:border-0 md:grid-cols-[110px_1fr_120px] md:items-center"
                >
                  <div className="font-mono text-sm font-semibold text-slate-600">{c.codigo}</div>
                  <div className="font-medium">{c.nombre}</div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TIPO_COLOR[c.tipo]}`}>
                      {c.tipo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : balance.length === 0 ? (
          <EmptyState title="Sin movimientos" description="El balance se arma con los asientos del libro diario." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="p-3 text-left font-semibold">Código</th>
                  <th className="p-3 text-left font-semibold">Cuenta</th>
                  <th className="p-3 text-right font-semibold">Debe</th>
                  <th className="p-3 text-right font-semibold">Haber</th>
                  <th className="p-3 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {balance.map((f) => (
                  <tr key={f.cuenta.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 font-mono text-slate-600">{f.cuenta.codigo}</td>
                    <td className="p-3">{f.cuenta.nombre}</td>
                    <td className="p-3 text-right">${f.debe.toFixed(2)}</td>
                    <td className="p-3 text-right">${f.haber.toFixed(2)}</td>
                    <td className={`p-3 text-right font-semibold ${f.saldo < 0 ? 'text-red-600' : ''}`}>
                      ${f.saldo.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <tr>
                  <td className="p-3" colSpan={2}>
                    Totales
                  </td>
                  <td className="p-3 text-right">${totalesBalance.debe.toFixed(2)}</td>
                  <td className="p-3 text-right">${totalesBalance.haber.toFixed(2)}</td>
                  <td className="p-3 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <Scale size={15} />
                      {Math.abs(totalesBalance.debe - totalesBalance.haber) < 0.01 ? 'Balanceado' : 'Descuadre'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalCuenta} onClose={() => setModalCuenta(false)} title="Nueva cuenta contable">
        <form onSubmit={guardarCuenta} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">
              Código
              <input
                name="codigo"
                required
                autoFocus
                placeholder="1.1.01"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Tipo
              <select
                name="tipo"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              >
                <option>Activo</option>
                <option>Pasivo</option>
                <option>Patrimonio</option>
                <option>Ingreso</option>
                <option>Egreso</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">
            Nombre
            <input
              name="nombre"
              required
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalCuenta(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <Button disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={modalAsiento} onClose={() => setModalAsiento(false)} title="Nuevo asiento contable">
        <form onSubmit={guardarAsiento} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">
              Fecha
              <input
                name="fecha"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Descripción
              <input
                name="descripcion"
                required
                placeholder="Cobro de consulta"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Líneas del asiento</p>
            {lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_90px_28px] items-center gap-2">
                <select
                  value={l.cuenta_id}
                  onChange={(e) =>
                    setLineas(lineas.map((x, j) => (j === i ? { ...x, cuenta_id: e.target.value } : x)))
                  }
                  className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-blue-500"
                  aria-label={`Cuenta de la línea ${i + 1}`}
                >
                  <option value="">Cuenta…</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.nombre}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Debe"
                  value={l.debe || ''}
                  onChange={(e) =>
                    setLineas(
                      lineas.map((x, j) =>
                        j === i ? { ...x, debe: parseFloat(e.target.value) || 0, haber: 0 } : x,
                      ),
                    )
                  }
                  className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
                  aria-label={`Debe de la línea ${i + 1}`}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Haber"
                  value={l.haber || ''}
                  onChange={(e) =>
                    setLineas(
                      lineas.map((x, j) =>
                        j === i ? { ...x, haber: parseFloat(e.target.value) || 0, debe: 0 } : x,
                      ),
                    )
                  }
                  className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
                  aria-label={`Haber de la línea ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => setLineas(lineas.filter((_, j) => j !== i))}
                  disabled={lineas.length <= 2}
                  className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                  aria-label={`Quitar línea ${i + 1}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLineas([...lineas, { cuenta_id: '', debe: 0, haber: 0, descripcion: '' }])}
              className="text-sm font-semibold text-blue-600"
            >
              + Agregar línea
            </button>
          </div>

          <div
            className={`flex justify-between rounded-xl p-3 text-sm font-semibold ${
              balanceado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            <span>Debe ${totalDebe.toFixed(2)}</span>
            <span>Haber ${totalHaber.toFixed(2)}</span>
            <span>{balanceado ? 'Balanceado ✓' : 'No balancea'}</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalAsiento(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <Button disabled={saving || !balanceado}>{saving ? 'Guardando…' : 'Registrar asiento'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
