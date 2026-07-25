import { useState, useEffect } from 'react'
import client from '../../../api/client'

function DeviceMaintenancePanel({ deviceId }) {
  const [maintenance, setMaintenance] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'CLEANING', notes: '' })

  useEffect(() => {
    async function fetchMaintenance() {
      try {
        const { data } = await client.get(`/devices/${deviceId}/maintenance`)
        setMaintenance(data)
      } catch {}
      setLoading(false)
    }
    fetchMaintenance()
  }, [deviceId])

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const { data } = await client.post(`/devices/${deviceId}/maintenance`, form)
      setMaintenance(prev => [data, ...prev])
      setForm({ type: 'CLEANING', notes: '' })
      setShowForm(false)
    } catch {}
  }

  const typeLabels = {
    CLEANING: { label: 'Limpieza', icon: 'cleaning_services', color: 'text-info' },
    CALIBRATION: { label: 'Calibración', icon: 'tune', color: 'text-amber' },
    REPLACEMENT: { label: 'Reemplazo', icon: 'build', color: 'text-error' },
    INSPECTION: { label: 'Inspección', icon: 'search', color: 'text-green-400' },
  }

  return (
    <div className="glass-card rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-18px">home_repair_service</span>
          <span className="chart-panel-label">REGISTRO DE MANTENIMIENTO</span>
        </div>
        <button className="btn btn-sm btn-outline" onClick={() => setShowForm(!showForm)}>
          <span className="material-symbols-outlined text-12px">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancelar' : 'Agregar'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-3 p-3 bg-surface-container-low rounded-lg space-y-2">
          <select className="select w-full" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {Object.entries(typeLabels).map(([key, v]) => (
              <option key={key} value={key}>{v.label}</option>
            ))}
          </select>
          <input
            type="text"
            className="input w-full"
            placeholder="Notas del mantenimiento..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <button type="submit" className="btn btn-primary btn-sm w-full">Guardar</button>
        </form>
      )}

      {loading ? (
        <div className="text-body-sm text-on-surface-variant">Cargando...</div>
      ) : maintenance.length === 0 ? (
        <div className="text-body-sm text-on-surface-variant text-center py-4">Sin registros de mantenimiento</div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {maintenance.map(m => {
            const cfg = typeLabels[m.type] || typeLabels.CLEANING
            return (
              <div key={m.id} className="flex items-start gap-2 p-2 bg-surface-container-low rounded">
                <span className={`material-symbols-outlined text-14px mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm text-on-surface font-medium">{cfg.label}</span>
                    <span className="text-8px text-on-surface-variant">{new Date(m.performedAt || m.createdAt).toLocaleDateString()}</span>
                  </div>
                  {m.notes && <p className="text-8px text-on-surface-variant mt-0.5">{m.notes}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DeviceMaintenancePanel
