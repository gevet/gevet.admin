/**
 * Clientes List Component
 * Displays list of clients with search and actions
 */

'use client'

import { useEffect, useState } from 'react'
import { Trash2, Edit2, ExternalLink } from 'lucide-react'
import { listarClientesAction } from '@/app/admin/actions/clientes'
import type { Cliente } from '@/lib/types/database'

interface ClientesListProps {
  searchTerm?: string
}

export function ClientesList({ searchTerm = '' }: ClientesListProps) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClientes()
  }, [])

  async function loadClientes() {
    setLoading(true)
    setError(null)

    const result = await listarClientesAction({ activo: true })

    if (result.error) {
      setError(result.error)
      setClientes([])
    } else {
      setClientes(result.data || [])
    }

    setLoading(false)
  }

  const filteredClientes = clientes.filter((cliente) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      cliente.nombre.toLowerCase().includes(searchLower) ||
      cliente.apellido.toLowerCase().includes(searchLower) ||
      cliente.email?.toLowerCase().includes(searchLower) ||
      cliente.numero_documento.includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600 dark:text-slate-400">Cargando clientes...</div>
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

  if (filteredClientes.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-400 mb-2">No hay clientes</p>
        <p className="text-slate-500 dark:text-slate-500 text-sm">
          {searchTerm ? 'Intenta con otra búsqueda' : 'Crea el primer cliente'}
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
                Documento
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                Teléfono
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.map((cliente) => (
              <tr
                key={cliente.id}
                className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {cliente.nombre} {cliente.apellido}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                  {cliente.tipo_documento}: {cliente.numero_documento}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                  {cliente.email || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                  {cliente.telefono || cliente.celular || '-'}
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

      {/* Footer */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-600 dark:text-slate-400">
        {filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''} encontrado{filteredClientes.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
