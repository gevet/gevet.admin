'use client'

import { useEffect, useState } from 'react'
import { FileText, Edit2, Trash2 } from 'lucide-react'
import { listarConsultasAction } from '@/app/admin/actions/consultas'
import type { Consulta } from '@/lib/types/database'

interface ConsultasListProps {
  searchTerm?: string
}

export function ConsultasList({ searchTerm = '' }: ConsultasListProps) {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConsultas()
  }, [])

  async function loadConsultas() {
    setLoading(true)
    setError(null)

    const result = await listarConsultasAction()
    if (result.error) {
      setError(result.error)
      setConsultas([])
    } else if (result.data) {
      setConsultas(result.data)
    }
    setLoading(false)
  }

  const filteredConsultas = consultas.filter((consulta) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      consulta.diagnostico?.toLowerCase().includes(searchLower) ||
      consulta.evaluacion?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600 dark:text-slate-400">Cargando consultas...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
        <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (filteredConsultas.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-400 mb-2">No hay consultas</p>
        <p className="text-slate-500 dark:text-slate-500 text-sm">
          {searchTerm ? 'Intenta con otra búsqueda' : 'Crea la primera consulta'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                Evaluación
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                Diagnóstico
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                Plan de Tratamiento
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredConsultas.map((consulta) => (
              <tr
                key={consulta.id}
                className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                  {new Date(consulta.creado_en).toLocaleDateString('es-ES')}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                  {consulta.evaluacion || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                  {consulta.diagnostico || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                  {consulta.plan || '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      title="Ver detalles"
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      title="Editar"
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-blue-600 dark:text-blue-400"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      title="Eliminar"
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-600 dark:text-slate-400">
        {filteredConsultas.length} consulta{filteredConsultas.length !== 1 ? 's' : ''} encontrada{filteredConsultas.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
