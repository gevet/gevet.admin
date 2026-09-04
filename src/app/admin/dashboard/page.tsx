'use client'

import { useEffect, useState } from 'react'
import { Users, PawPrint, Calendar, FileText } from 'lucide-react'
import { AdminLayout } from '@/components/admin/admin-layout'
import { DashboardMetrics } from '@/components/admin/dashboard/dashboard-metrics'
import { RecentActivity } from '@/components/admin/dashboard/recent-activity'
import { listarClientesAction } from '@/app/admin/actions/clientes'
import { listarTurnosFechaAction } from '@/app/admin/actions/turnos'
import { listarConsultasAction } from '@/app/admin/actions/consultas'

export default function DashboardPage() {
  const [clientCount, setClientCount] = useState(0)
  const [appointmentCount, setAppointmentCount] = useState(0)
  const [consultationCount, setConsultationCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [])

  async function loadMetrics() {
    setLoading(true)

    const clientesResult = await listarClientesAction({ activo: true })
    if (clientesResult.data) {
      setClientCount(clientesResult.data.length)
    }

    const today = new Date().toISOString().split('T')[0]
    const turnosResult = await listarTurnosFechaAction(today)
    if (turnosResult.data) {
      setAppointmentCount(turnosResult.data.length)
    }

    const consultasResult = await listarConsultasAction()
    if (consultasResult.data) {
      setConsultationCount(consultasResult.data.length)
    }

    setLoading(false)
  }

  const metrics = [
    {
      title: 'Clientes Activos',
      value: clientCount,
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Turnos Hoy',
      value: appointmentCount,
      icon: Calendar,
      color: 'green',
    },
    {
      title: 'Total Consultas',
      value: consultationCount,
      icon: FileText,
      color: 'purple',
    },
    {
      title: 'Mascotas Registradas',
      value: '-',
      icon: PawPrint,
      color: 'orange',
    },
  ]

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Resumen general de tu clínica veterinaria
          </p>
        </div>

        <DashboardMetrics metrics={metrics} loading={loading} />

        <div className="mt-8">
          <RecentActivity />
        </div>
      </div>
    </AdminLayout>
  )
}
