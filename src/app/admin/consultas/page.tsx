'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AdminLayout } from '@/components/admin/admin-layout'
import { ConsultasList } from '@/components/admin/consultas/consultas-list'
import { ConsultaFormModal } from '@/components/admin/consultas/consulta-form-modal'

export default function ConsultasPage() {
  const [showFormModal, setShowFormModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  const handleConsultaCreated = () => {
    setShowFormModal(false)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Consultas
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Registro de consultas médicas veterinarias
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
          <input
            type="text"
            placeholder="Buscar por mascota, cliente, motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-md px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nueva Consulta
          </button>
        </div>

        <ConsultasList key={refreshKey} searchTerm={searchTerm} />

        {showFormModal && (
          <ConsultaFormModal
            onClose={() => setShowFormModal(false)}
            onSuccess={handleConsultaCreated}
          />
        )}
      </div>
    </AdminLayout>
  )
}
