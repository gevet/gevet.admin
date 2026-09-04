'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Edit2, Trash2, Eye } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'
import { ClienteDetailView } from '@/components/admin/clientes/cliente-detail-view'
import { obtenerClienteAction } from '@/app/admin/actions/clientes'
import type { Cliente } from '@/lib/types/database'

export default function ClienteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (clienteId) {
      loadCliente()
    }
  }, [clienteId])

  async function loadCliente() {
    setLoading(true)
    setError(null)

    const result = await obtenerClienteAction(clienteId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setCliente(result.data)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      return
    }
    // TODO: Implement delete action
    setError('Eliminación no implementada aún')
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600 dark:text-slate-400">Cargando cliente...</div>
        </div>
      </AdminLayout>
    )
  }

  if (error && !cliente) {
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
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!cliente) {
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
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">Cliente no encontrado</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {cliente.nombre} {cliente.apellido}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {cliente.numero_documento}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/admin/clientes/${clienteId}/360`)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Eye className="w-4 h-4" />
              Historial 360°
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        <ClienteDetailView cliente={cliente} isEditing={isEditing} onEditChange={setIsEditing} />
      </div>
    </AdminLayout>
  )
}
