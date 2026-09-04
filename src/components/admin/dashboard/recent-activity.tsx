'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'

export function RecentActivity() {
  const [activities] = useState([
    {
      id: '1',
      title: 'Consulta registrada',
      description: 'Consulta veterinaria para mascota "Max"',
      timestamp: '2 horas atrás',
      type: 'consulta',
    },
    {
      id: '2',
      title: 'Nuevo cliente',
      description: 'Se registró "Juan Pérez" como nuevo cliente',
      timestamp: '5 horas atrás',
      type: 'cliente',
    },
    {
      id: '3',
      title: 'Turno completado',
      description: 'Turno veterinario completado exitosamente',
      timestamp: '1 día atrás',
      type: 'turno',
    },
    {
      id: '4',
      title: 'Mascota registrada',
      description: 'Nueva mascota "Bella" registrada en el sistema',
      timestamp: '2 días atrás',
      type: 'mascota',
    },
  ])

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'consulta':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
      case 'cliente':
        return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
      case 'turno':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
      case 'mascota':
        return 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
      default:
        return 'bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400'
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
        Actividad Reciente
      </h2>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex gap-4 pb-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 last:pb-0"
          >
            <div className={`rounded-lg p-2 h-fit ${getActivityColor(activity.type)}`}>
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white">
                {activity.title}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {activity.description}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                {activity.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
