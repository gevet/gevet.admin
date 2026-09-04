'use client'

import { useState } from 'react'
import type { Cliente } from '@/lib/types/database'

interface ClienteDetailViewProps {
  cliente: Cliente
  isEditing: boolean
  onEditChange: (editing: boolean) => void
}

const DOCUMENT_TYPES = ['DNI', 'CUIT', 'CUIL', 'PASAPORTE', 'OTRO']
const IVA_CONDITIONS = ['Consumidor Final', 'Responsable Inscripto', 'Responsable No Inscripto', 'Exento', 'No Categorizado']

export function ClienteDetailView({ cliente, isEditing, onEditChange }: ClienteDetailViewProps) {
  const [formData, setFormData] = useState({
    tipo_documento: cliente.tipo_documento,
    numero_documento: cliente.numero_documento,
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    razon_social: cliente.razon_social || '',
    email: cliente.email || '',
    telefono: cliente.telefono || '',
    celular: cliente.celular || '',
    direccion: cliente.direccion || '',
    numero_calle: cliente.numero_calle || '',
    apartamento: cliente.apartamento || '',
    ciudad: cliente.ciudad || '',
    provincia: cliente.provincia || '',
    codigo_postal: cliente.codigo_postal || '',
    pais: cliente.pais,
    responsable_iva: cliente.responsable_iva,
    condicion_iva: cliente.condicion_iva || '',
    observaciones: cliente.observaciones || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData((prev) => ({ ...prev, [name]: finalValue }))
  }

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Editar Cliente</h2>

        <form className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Identificación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tipo de Documento *
                </label>
                <select
                  name="tipo_documento"
                  value={formData.tipo_documento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Número de Documento *
                </label>
                <input
                  type="text"
                  name="numero_documento"
                  value={formData.numero_documento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Información Personal
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Apellido *
                </label>
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Razón Social
                </label>
                <input
                  type="text"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Contacto
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Celular
                </label>
                <input
                  type="tel"
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Ubicación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Número de Calle
                </label>
                <input
                  type="text"
                  name="numero_calle"
                  value={formData.numero_calle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Apartamento
                </label>
                <input
                  type="text"
                  name="apartamento"
                  value={formData.apartamento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Provincia
                </label>
                <input
                  type="text"
                  name="provincia"
                  value={formData.provincia}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Código Postal
                </label>
                <input
                  type="text"
                  name="codigo_postal"
                  value={formData.codigo_postal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Impuestos
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="responsable_iva"
                  checked={formData.responsable_iva}
                  onChange={handleChange}
                  className="rounded border-slate-300 dark:border-slate-600"
                  id="responsable-iva"
                />
                <label htmlFor="responsable-iva" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Responsable de IVA
                </label>
              </div>
              {formData.responsable_iva && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Condición de IVA
                  </label>
                  <select
                    name="condicion_iva"
                    value={formData.condicion_iva}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar condición...</option>
                    {IVA_CONDITIONS.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Observaciones
            </label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onEditChange(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Información Personal
          </h2>
          <dl className="space-y-4">
            <div className="grid grid-cols-2">
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Email:</dt>
              <dd className="text-sm text-slate-900 dark:text-white">{cliente.email || '-'}</dd>
            </div>
            <div className="grid grid-cols-2">
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Teléfono:</dt>
              <dd className="text-sm text-slate-900 dark:text-white">{cliente.telefono || '-'}</dd>
            </div>
            <div className="grid grid-cols-2">
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Celular:</dt>
              <dd className="text-sm text-slate-900 dark:text-white">{cliente.celular || '-'}</dd>
            </div>
            {cliente.razon_social && (
              <div className="grid grid-cols-2">
                <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Razón Social:</dt>
                <dd className="text-sm text-slate-900 dark:text-white">{cliente.razon_social}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Ubicación
          </h2>
          <dl className="space-y-4">
            <div className="grid grid-cols-2">
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Dirección:</dt>
              <dd className="text-sm text-slate-900 dark:text-white">{cliente.direccion || '-'}</dd>
            </div>
            <div className="grid grid-cols-2">
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Ciudad:</dt>
              <dd className="text-sm text-slate-900 dark:text-white">{cliente.ciudad || '-'}</dd>
            </div>
            <div className="grid grid-cols-2">
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Provincia:</dt>
              <dd className="text-sm text-slate-900 dark:text-white">{cliente.provincia || '-'}</dd>
            </div>
            <div className="grid grid-cols-2">
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">País:</dt>
              <dd className="text-sm text-slate-900 dark:text-white">{cliente.pais}</dd>
            </div>
            {cliente.codigo_postal && (
              <div className="grid grid-cols-2">
                <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Código Postal:</dt>
                <dd className="text-sm text-slate-900 dark:text-white">{cliente.codigo_postal}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 h-fit">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Información Fiscal
        </h2>
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Responsable IVA:</dt>
            <dd className="text-sm text-slate-900 dark:text-white">
              {cliente.responsable_iva ? 'Sí' : 'No'}
            </dd>
          </div>
          {cliente.condicion_iva && (
            <div>
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Condición IVA:</dt>
              <dd className="text-sm text-slate-900 dark:text-white">{cliente.condicion_iva}</dd>
            </div>
          )}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <dt className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Registrado:</dt>
            <dd className="text-xs text-slate-500 dark:text-slate-500">
              {new Date(cliente.creado_en).toLocaleDateString('es-ES')}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
