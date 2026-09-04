'use client'

import { useEffect, useState } from 'react'
import { eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, format, isSameDay } from 'date-fns'
import { listarTurnosFechaAction } from '@/app/admin/actions/turnos'
import type { Turno } from '@/lib/types/database'

interface TurnosCalendarProps {
  currentDate: Date
}

export function TurnosCalendar({ currentDate }: TurnosCalendarProps) {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTurnos()
  }, [currentDate])

  async function loadTurnos() {
    setLoading(true)
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const allTurnos: Turno[] = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const result = await listarTurnosFechaAction(d.toISOString().split('T')[0])
      if (result.data) {
        allTurnos.push(...result.data)
      }
    }

    setTurnos(allTurnos)
    setLoading(false)
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  })

  const getTurnosForDay = (date: Date) => {
    return turnos.filter((turno) =>
      isSameDay(new Date(turno.fecha_hora), date)
    )
  }

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const firstDayOfMonth = startOfMonth(currentDate).getDay()
  const emptyDays = Array(firstDayOfMonth).fill(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600 dark:text-slate-400">Cargando turnos...</div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-slate-700 dark:text-slate-300 text-sm py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty days before month starts */}
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {/* Days of month */}
        {days.map((day) => {
          const dayTurnos = getTurnosForDay(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={day.toISOString()}
              className={`aspect-square p-2 rounded-lg border transition-colors ${
                isToday
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              } ${!isCurrentMonth ? 'bg-slate-50 dark:bg-slate-900/50' : ''}`}
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                {format(day, 'd')}
              </div>
              <div className="space-y-1 text-xs">
                {dayTurnos.slice(0, 2).map((turno) => (
                  <div
                    key={turno.id}
                    className="bg-blue-500 text-white rounded px-1 py-0.5 truncate"
                    title={turno.motivo}
                  >
                    {format(new Date(turno.fecha_hora), 'HH:mm')}
                  </div>
                ))}
                {dayTurnos.length > 2 && (
                  <div className="text-slate-600 dark:text-slate-400">
                    +{dayTurnos.length - 2} más
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
