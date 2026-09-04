/**
 * Admin Layout Component
 * Provides sidebar navigation, header, and main content area for all admin pages
 */

'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { GevetLogo } from '@/components/brand/gevet-logo'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/clientes', label: 'Clientes', icon: '👥' },
    { href: '/admin/mascotas', label: 'Mascotas', icon: '🐾' },
    { href: '/admin/turnos', label: 'Turnos', icon: '📅' },
    { href: '/admin/consultas', label: 'Consultas', icon: '📋' },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg dark:bg-slate-800 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200 dark:border-slate-700">
            <GevetLogo imageClassName="h-8 w-8" />
            <span className="text-lg font-bold text-slate-900 dark:text-white">GeVet</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <p>GeVet Admin</p>
            <p>v1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white shadow-sm dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 lg:hidden hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
            <div className="flex-1" />
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Tenant Admin
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
