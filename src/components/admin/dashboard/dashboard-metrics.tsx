'use client'

import { LucideIcon } from 'lucide-react'

interface Metric {
  title: string
  value: number | string
  icon: LucideIcon
  color: string
}

interface DashboardMetricsProps {
  metrics: Metric[]
  loading: boolean
}

const colorClasses = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
}

export function DashboardMetrics({ metrics, loading }: DashboardMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.title}
          className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {metric.title}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {loading ? '...' : metric.value}
              </p>
            </div>
            <div className={`rounded-lg p-3 ${colorClasses[metric.color as keyof typeof colorClasses]}`}>
              <metric.icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
