'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { crearConsultaAction } from '@/app/admin/actions/consultas'
import { listarClientesAction } from '@/app/admin/actions/clientes'
import { listarMascotasClienteAction } from '@/app/admin/actions/mascotas'
import type { Cliente, Mascota } from '@/lib/types/database'

interface ConsultaFormModalProps {
  onClose: () => void
  onSuccess?: () => void
  turnoId?: string
}

export function ConsultaFormModal({ onClose, onSuccess, turnoId }: ConsultaFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [formData, setFormData] = useState({
    turno_id: turnoId || '',
    cliente_id: '',
    mascota_id: '',
    profesional_id: '',
    subjetivo: '',
    objetivo: '',
    evaluacion: '',
    plan: '',
    temperatura_celsius: '',
    frecuencia_cardiaca_bpm: '',
    frecuencia_respiratoria_rpm: '',
    peso_kg: '',
    diagnostico: '',
    prescripciones: '',
    observaciones: '',
    referencia_a_especialista: '',
  })

  useEffect(() => {
    loadClientes()
  }, [])

  useEffect(() => {
    if (formData.cliente_id) {
      loadMascotas(formData.cliente_id)
    }
  }, [formData.cliente_id])

  async function loadClientes() {
    const result = await listarClientesAction({ activo: true })
    if (result.data) {
      setClientes(result.data)
      if (result.data.length > 0) {
        setFormData((prev) => ({ ...prev, cliente_id: result.data![0].id }))
      }
    }
  }

  async function loadMascotas(clienteId: string) {
    const result = await listarMascotasClienteAction(clienteId)
    if (result.data) {
      setMascotas(result.data)
      if (result.data.length > 0) {
        setFormData((prev) => ({ ...prev, mascota_id: result.data![0].id }))
      }
    } else {
      setMascotas([])
      setFormData((prev) => ({ ...prev, mascota_id: '' }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const submitData = {
      ...formData,
      turno_id: formData.turno_id || '',
      temperatura_celsius: formData.temperatura_celsius ? parseFloat(formData.temperatura_celsius) : undefined,
      frecuencia_cardiaca_bpm: formData.frecuencia_cardiaca_bpm ? parseInt(formData.frecuencia_cardiaca_bpm) : undefined,
      frecuencia_respiratoria_rpm: formData.frecuencia_respiratoria_rpm ? parseInt(formData.frecuencia_respiratoria_rpm) : undefined,
      peso_kg: formData.peso_kg ? parseFloat(formData.peso_kg) : undefined,
    }

    const result = await crearConsultaAction(submitData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setLoading(false)
      onSuccess?.()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Nueva Consulta Veterinaria
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Paciente
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Cliente *
                </label>
                <select
                  name="cliente_id"
                  value={formData.cliente_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mascota *
                </label>
                <select
                  name="mascota_id"
                  value={formData.mascota_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar mascota...</option>
                  {mascotas.map((mascota) => (
                    <option key={mascota.id} value={mascota.id}>
                      {mascota.nombre} ({mascota.especie})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Signos Vitales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Temperatura (°C)
                </label>
                <input
                  type="number"
                  name="temperatura_celsius"
                  value={formData.temperatura_celsius}
                  onChange={handleChange}
                  step="0.1"
                  min="35"
                  max="42"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="37.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  name="peso_kg"
                  value={formData.peso_kg}
                  onChange={handleChange}
                  step="0.1"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="25.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Frecuencia Cardíaca (bpm)
                </label>
                <input
                  type="number"
                  name="frecuencia_cardiaca_bpm"
                  value={formData.frecuencia_cardiaca_bpm}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="120"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Frecuencia Respiratoria (rpm)
                </label>
                <input
                  type="number"
                  name="frecuencia_respiratoria_rpm"
                  value={formData.frecuencia_respiratoria_rpm}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Formato SOAP
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Subjetivo (S) - Historia del propietario
                </label>
                <textarea
                  name="subjetivo"
                  value={formData.subjetivo}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción de síntomas, duración, comportamiento..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Objetivo (O) - Hallazgos clínicos
                </label>
                <textarea
                  name="objetivo"
                  value={formData.objetivo}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Examen físico, hallazgos, pruebas realizadas..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Evaluación (A) - Diagnóstico e impresión *
                </label>
                <textarea
                  name="evaluacion"
                  value={formData.evaluacion}
                  onChange={handleChange}
                  rows={2}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Diagnóstico diferencial, conclusiones clínicas..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Plan (P) - Tratamiento y seguimiento *
                </label>
                <textarea
                  name="plan"
                  value={formData.plan}
                  onChange={handleChange}
                  rows={2}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Medicamentos, procedimientos, seguimiento recomendado..."
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Detalles Adicionales
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Diagnóstico Final
                </label>
                <input
                  type="text"
                  name="diagnostico"
                  value={formData.diagnostico}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Otitis media, requiere antibióticos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Prescripciones
                </label>
                <textarea
                  name="prescripciones"
                  value={formData.prescripciones}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Medicamentos y dosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Referencia a Especialista
                </label>
                <input
                  type="text"
                  name="referencia_a_especialista"
                  value={formData.referencia_a_especialista}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Si aplica, especialidad recomendada"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Observaciones
                </label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium"
            >
              {loading ? 'Guardando...' : 'Guardar Consulta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
