'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Clock, Users, CheckCircle2, Timer, BellRing, DoorOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import {
  crearCheckInAction,
  listarSalaEsperaAction,
  actualizarEstadoCheckInAction,
  obtenerResumenRecepcionAction,
} from '@/app/admin/actions/recepcion'
import type { CheckIn } from '@/lib/types/database'

type CheckInConDatos = CheckIn & {
  mascotas: { nombre: string; especie: string } | null
  clientes: { nombre: string; apellido: string; telefono: string | null } | null
}

type MascotaOpcion = { id: string; nombre: string; cliente_id: string; especie: string }
type Resumen = { enEspera: number; enAtencion: number; finalizados: number; total: number; esperaPromedio: number }

const PRIORIDAD_COLOR: Record<string, string> = {
  Normal: 'bg-slate-100 text-slate-700',
  Urgente: 'bg-amber-100 text-amber-700',
  Emergencia: 'bg-red-100 text-red-700',
}

const ESTADO_COLOR: Record<string, string> = {
  'En Espera': 'bg-blue-100 text-blue-700',
  Llamado: 'bg-violet-100 text-violet-700',
  'En Atención': 'bg-amber-100 text-amber-700',
  Finalizado: 'bg-emerald-100 text-emerald-700',
  Ausente: 'bg-slate-100 text-slate-500',
}

export function RecepcionBoard() {
  const [salaEspera, setSalaEspera] = useState<CheckInConDatos[]>([])
  const [resumen, setResumen] = useState<Resumen>({
    enEspera: 0,
    enAtencion: 0,
    finalizados: 0,
    total: 0,
    esperaPromedio: 0,
  })
  const [mascotas, setMascotas] = useState<MascotaOpcion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [modalCheckIn, setModalCheckIn] = useState(false)
  const [mascotaSel, setMascotaSel] = useState('')
  const [verCerrados, setVerCerrados] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [sala, res, m] = await Promise.all([
      listarSalaEsperaAction(verCerrados),
      obtenerResumenRecepcionAction(),
      supabase.from('mascotas').select('id, nombre, cliente_id, especie').eq('activo', true).order('nombre'),
    ])
    if (sala.success && sala.data) setSalaEspera(sala.data as CheckInConDatos[])
    if (res.success && res.data) setResumen(res.data)
    if (m.data) setMascotas(m.data as MascotaOpcion[])
    setLoading(false)
  }, [verCerrados])

  useEffect(() => {
    void load()
  }, [load])

  // The waiting room is a live board: refresh it while it is on screen
  useEffect(() => {
    const id = setInterval(() => void load(), 30000)
    return () => clearInterval(id)
  }, [load])

  async function guardarCheckIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const mascota = mascotas.find((m) => m.id === mascotaSel)
    if (!mascota) {
      setError('Seleccioná una mascota')
      return
    }
    setSaving(true)
    setError(undefined)
    const form = new FormData(event.currentTarget)
    const result = await crearCheckInAction({
      cliente_id: mascota.cliente_id,
      mascota_id: mascota.id,
      prioridad: String(form.get('prioridad')) as CheckIn['prioridad'],
      motivo: String(form.get('motivo') || ''),
      observaciones: String(form.get('observaciones') || ''),
    })
    if (result.success) {
      setModalCheckIn(false)
      setMascotaSel('')
      await load()
    } else {
      setError(result.error)
    }
    setSaving(false)
  }

  async function avanzar(id: string, estado: CheckIn['estado'], box?: string) {
    const result = await actualizarEstadoCheckInAction(id, estado, box)
    if (result.success) await load()
    else setError(result.error)
  }

  function esperaMinutos(llegada: string) {
    return Math.round((Date.now() - new Date(llegada).getTime()) / 60000)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Agenda</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Recepción y sala de espera</h1>
          <p className="mt-1 text-sm text-slate-500">
            Check-in de pacientes, orden por prioridad y seguimiento del tiempo de espera.
          </p>
        </div>
        <Button onClick={() => setModalCheckIn(true)}>
          <Plus size={18} /> Nuevo check-in
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="En espera" value={resumen.enEspera} color="text-blue-600 bg-blue-50" />
        <StatCard icon={DoorOpen} label="En atención" value={resumen.enAtencion} color="text-amber-600 bg-amber-50" />
        <StatCard
          icon={CheckCircle2}
          label="Atendidos hoy"
          value={resumen.finalizados}
          color="text-emerald-600 bg-emerald-50"
        />
        <StatCard
          icon={Timer}
          label="Espera promedio"
          value={`${resumen.esperaPromedio} min`}
          color="text-violet-600 bg-violet-50"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">Sala de espera</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={verCerrados}
            onChange={(e) => setVerCerrados(e.target.checked)}
            className="h-4 w-4"
          />
          Ver finalizados
        </label>
      </div>

      <Card className="mt-3 !p-0">
        {loading ? (
          <div className="min-h-64 animate-pulse bg-slate-50" />
        ) : salaEspera.length === 0 ? (
          <EmptyState
            title="La sala de espera está vacía"
            description="Registrá el check-in de un paciente cuando llegue a la clínica."
            action={<Button onClick={() => setModalCheckIn(true)}><Plus size={18} /> Nuevo check-in</Button>}
          />
        ) : (
          <div>
            {salaEspera.map((c) => (
              <div
                key={c.id}
                className="grid gap-3 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[60px_1.5fr_120px_130px_1fr] md:items-center"
              >
                <div className="font-mono text-lg font-bold text-slate-400">#{c.numero}</div>
                <div>
                  <div className="font-semibold">{c.mascotas?.nombre ?? 'Paciente'}</div>
                  <div className="text-xs text-slate-500">
                    {c.clientes ? `${c.clientes.nombre} ${c.clientes.apellido}` : ''}
                    {c.clientes?.telefono ? ` · ${c.clientes.telefono}` : ''}
                  </div>
                  {c.motivo && <div className="mt-0.5 text-xs text-slate-500">{c.motivo}</div>}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Clock size={14} />
                  {c.estado === 'En Espera' ? `${esperaMinutos(c.hora_llegada)} min` : '—'}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_COLOR[c.estado]}`}>
                    {c.estado}
                  </span>
                  {c.prioridad !== 'Normal' && (
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${PRIORIDAD_COLOR[c.prioridad]}`}>
                      {c.prioridad}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {c.estado === 'En Espera' && (
                    <>
                      <button
                        onClick={() => void avanzar(c.id, 'Llamado')}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        <BellRing size={14} /> Llamar
                      </button>
                      <button
                        onClick={() => void avanzar(c.id, 'Ausente')}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                      >
                        Ausente
                      </button>
                    </>
                  )}
                  {c.estado === 'Llamado' && (
                    <button
                      onClick={() => {
                        const box = prompt('¿En qué box lo atienden?') ?? ''
                        void avanzar(c.id, 'En Atención', box)
                      }}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      Pasar a atención
                    </button>
                  )}
                  {c.estado === 'En Atención' && (
                    <button
                      onClick={() => void avanzar(c.id, 'Finalizado')}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Finalizar
                    </button>
                  )}
                  {c.box && <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">Box {c.box}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalCheckIn} onClose={() => setModalCheckIn(false)} title="Nuevo check-in">
        <form onSubmit={guardarCheckIn} className="space-y-4">
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
          <label className="block text-sm font-medium">
            Prioridad
            <select
              name="prioridad"
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
            >
              <option>Normal</option>
              <option>Urgente</option>
              <option>Emergencia</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Motivo de la visita
            <input
              name="motivo"
              placeholder="Control anual, vacunación, malestar…"
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-medium">
            Observaciones
            <textarea
              name="observaciones"
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-blue-500"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalCheckIn(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <Button disabled={saving}>{saving ? 'Registrando…' : 'Registrar llegada'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number }>
  label: string
  value: string | number
  color: string
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <span className={`rounded-xl p-3 ${color}`}>
          <Icon size={20} />
        </span>
      </div>
    </Card>
  )
}
