'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { AdminLayout } from '@/components/admin/admin-layout'
import { MascotasList } from '@/components/admin/mascotas/mascotas-list'
import { MascotaFormModal } from '@/components/admin/mascotas/mascota-form-modal'

export default function MascotasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleMascotaCreated = () => {
    setShowFormModal(false)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Mascotas
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestiona las mascotas de tus clientes
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar mascota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nueva Mascota
          </button>
        </div>

        <MascotasList key={refreshKey} searchTerm={searchTerm} />

        {showFormModal && (
          <MascotaFormModal
            onClose={() => setShowFormModal(false)}
            onSuccess={handleMascotaCreated}
          />
        )}
      </div>
    </AdminLayout>
  )
}
