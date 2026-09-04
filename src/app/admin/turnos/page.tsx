'use client'

import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { AdminLayout } from '@/components/admin/admin-layout'
import { TurnosCalendar } from '@/components/admin/turnos/turnos-calendar'
import { TurnoFormModal } from '@/components/admin/turnos/turno-form-modal'
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns'

export default function TurnosPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showFormModal, setShowFormModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleTurnoCreated = () => {
    setShowFormModal(false)
    setRefreshKey((prev) => prev + 1)
  }

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => addDays(startOfMonth(prev), -1))
  }

  const goToNextMonth = () => {
    setCurrentDate((prev) => addDays(endOfMonth(prev), 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Turnos
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestiona la agenda de tu clínica veterinaria
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white min-w-48 text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Hoy
            </button>
            <button
              onClick={() => setShowFormModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Nuevo Turno
            </button>
          </div>
        </div>

        <TurnosCalendar key={refreshKey} currentDate={currentDate} />

        {showFormModal && (
          <TurnoFormModal
            onClose={() => setShowFormModal(false)}
            onSuccess={handleTurnoCreated}
          />
        )}
      </div>
    </AdminLayout>
  )
}
