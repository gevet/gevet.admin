'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'
import { obtenerConsultaAction } from '@/app/admin/actions/consultas'
import type { Consulta } from '@/lib/types/database'

export default function ConsultaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const consultaId = params.id as string

  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (consultaId) {
      loadConsulta()
    }
  }, [consultaId])

  async function loadConsulta() {
    setLoading(true)
    setError(null)

    const result = await obtenerConsultaAction(consultaId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setConsulta(result.data)
    }
    setLoading(false)
  }

  const handleExportPDF = () => {
    // TODO: Implement PDF export for consulta
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600 dark:text-slate-400">Cargando consulta...</div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !consulta) {
    return (
      <AdminLayout>
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
            <p className="text-red-700 dark:text-red-400 text-sm">{error || 'Consulta no encontrada'}</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 print:border-0 print:shadow-none">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Consulta Veterinaria
          </h1>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                Evaluación
              </h2>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {consulta.evaluacion}
                </p>
              </div>
            </div>

            {consulta.subjetivo && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  Historia Subjetiva
                </h2>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {consulta.subjetivo}
                  </p>
                </div>
              </div>
            )}

            {consulta.objetivo && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  Hallazgos Objetivos
                </h2>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {consulta.objetivo}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                Plan de Tratamiento
              </h2>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {consulta.plan}
                </p>
              </div>
            </div>

            {consulta.diagnostico && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  Diagnóstico
                </h2>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-700 dark:text-slate-300">{consulta.diagnostico}</p>
                </div>
              </div>
            )}

            {consulta.prescripciones && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  Prescripciones
                </h2>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {consulta.prescripciones}
                  </p>
                </div>
              </div>
            )}

            {consulta.referencia_a_especialista && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  Referencia a Especialista
                </h2>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-amber-800 dark:text-amber-400">{consulta.referencia_a_especialista}</p>
                </div>
              </div>
            )}

            {consulta.observaciones && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  Observaciones
                </h2>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {consulta.observaciones}
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 text-xs text-slate-500 dark:text-slate-400">
              <p>Fecha: {new Date(consulta.creado_en).toLocaleDateString('es-ES')}</p>
              <p>Hora: {new Date(consulta.creado_en).toLocaleTimeString('es-ES')}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
