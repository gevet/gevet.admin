'use client'

import { useEffect, useState } from 'react'
import { Trash2, Edit2, ExternalLink } from 'lucide-react'
import { listarMascotasClienteAction } from '@/app/admin/actions/mascotas'
import { listarClientesAction } from '@/app/admin/actions/clientes'
import type { Mascota } from '@/lib/types/database'

interface MascotasListProps {
  searchTerm?: string
}

export function MascotasList({ searchTerm = '' }: MascotasListProps) {
  const [mascotas, setMascotas] = useState<(Mascota & { cliente_nombre?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMascotas()
  }, [])

  async function loadMascotas() {
    setLoading(true)
    setError(null)

    const clientesResult = await listarClientesAction({ activo: true })
    if (clientesResult.error || !clientesResult.data) {
      setMascotas([])
      setLoading(false)
      return
    }

    const allMascotas: (Mascota & { cliente_nombre?: string })[] = []

    for (const cliente of clientesResult.data) {
      const mascotasResult = await listarMascotasClienteAction(cliente.id)
      if (mascotasResult.data) {
        allMascotas.push(
          ...mascotasResult.data.map((m) => ({
            ...m,
            cliente_nombre: `${cliente.nombre} ${cliente.apellido}`,
          }))
        )
      }
    }

    setMascotas(allMascotas)
    setLoading(false)
  }

  const filteredMascotas = mascotas.filter((mascota) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      mascota.nombre.toLowerCase().includes(searchLower) ||
      mascota.especie.toLowerCase().includes(searchLower) ||
      mascota.cliente_nombre?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600 dark:text-slate-400">Cargando mascotas...</div>
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

  if (filteredMascotas.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-400 mb-2">No hay mascotas</p>
        <p className="text-slate-500 dark:text-slate-500 text-sm">
          {searchTerm ? 'Intenta con otra búsqueda' : 'Crea la primera mascota'}
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
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                Especie
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                Raza
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMascotas.map((mascota) => (
              <tr
                key={mascota.id}
                className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                  {mascota.nombre}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                  <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs font-medium">
                    {mascota.especie}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                  {mascota.cliente_nombre || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                  {mascota.raza || '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      title="Ver detalles"
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                    >
                      <ExternalLink className="w-4 h-4" />
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
        {filteredMascotas.length} mascota{filteredMascotas.length !== 1 ? 's' : ''} encontrada{filteredMascotas.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
