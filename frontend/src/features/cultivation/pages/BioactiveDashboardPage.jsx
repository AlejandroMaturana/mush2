import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import client from '../../../api/client.js'
import CompoundBar from '../components/CompoundBar.jsx'

export default function BioactiveDashboard() {
  const { id } = useParams()
  const [correlation, setCorrelation] = useState(null)
  const [bioactives, setBioactives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    compoundName: '',
    concentration: '',
    unit: 'mg/g',
    labSource: '',
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    try {
      setLoading(true)
      const [corrRes, bioRes] = await Promise.all([
        client.get(`/cycles/${id}/bioactives/correlation`),
        client.get(`/cycles/${id}/bioactives`),
      ])
      setCorrelation(corrRes.data)
      setBioactives(bioRes.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading bioactive data')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    try {
      await client.post(`/cycles/${id}/bioactives`, {
        ...formData,
        concentration: parseFloat(formData.concentration),
      })
      setShowAddForm(false)
      setFormData({ compoundName: '', concentration: '', unit: 'mg/g', labSource: '', notes: '' })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Error adding bioactive')
    }
  }

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Cargando datos de bioactivos...</div>
  if (error) return <div className="p-8 text-center text-error">{error}</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-headline-lg text-on-surface">Compuestos bioactivos</h1>
          <p className="text-body-md text-on-surface-variant">
            {correlation?.species || 'Ciclo'} — Ciclo #{id}
          </p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
          {showAddForm ? 'CANCELAR' : '+ AGREGAR ANÁLISIS'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-surface-container border border-outline-variant rounded-lg p-5 space-y-4">
          <h3 className="text-title-md text-on-surface">Nuevo análisis de bioactivos</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">NOMBRE DEL COMPUESTO</label>
              <input
                type="text"
                value={formData.compoundName}
                onChange={e => setFormData({ ...formData, compoundName: e.target.value })}
                placeholder="Ej: beta_glucanos"
                className="input"
                required
              />
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">CONCENTRACIÓN</label>
              <input
                type="number"
                step="0.01"
                value={formData.concentration}
                onChange={e => setFormData({ ...formData, concentration: e.target.value })}
                placeholder="Ej: 32.5"
                className="input"
                required
              />
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">UNIDAD</label>
              <input
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">FUENTE DE LAB</label>
              <input
                type="text"
                value={formData.labSource}
                onChange={e => setFormData({ ...formData, labSource: e.target.value })}
                placeholder="Ej: HPLC"
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">NOTAS</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full"
              rows={2}
            />
          </div>
          <button type="submit" className="btn btn-primary">GUARDAR ANÁLISIS</button>
        </form>
      )}

      {correlation?.compounds?.length > 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-lg p-5">
          <h2 className="text-title-md text-on-surface mb-4">Resumen de compuestos</h2>
          <div className="space-y-3">
            {correlation.compounds.map(c => (
              <CompoundBar key={c.name} compound={c} />
            ))}
          </div>
        </div>
      )}

      {correlation?.environmentByPhase && Object.keys(correlation.environmentByPhase).length > 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-lg p-5">
          <h2 className="text-title-md text-on-surface mb-4">Ambiente por fase</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(correlation.environmentByPhase).map(([phase, env]) => (
              <div key={phase} className="bg-surface-container-low rounded-lg p-4">
                <h3 className="font-label-caps text-10px text-on-surface-variant mb-3">{phase}</h3>
                <div className="space-y-2 text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Temp</span>
                    <span className="text-on-surface font-mono">{env.avgTemp}°C ({env.minTemp}–{env.maxTemp})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Humedad</span>
                    <span className="text-on-surface font-mono">{env.avgHum}% ({env.minHum}–{env.maxHum})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">CO₂</span>
                    <span className="text-on-surface font-mono">{env.avgCO2}ppm ({env.minCO2}–{env.maxCO2})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Instantáneas</span>
                    <span className="text-on-surface font-mono">{env.snapshots}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {correlation?.insights?.length > 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-lg p-5">
          <h2 className="text-title-md text-on-surface mb-3">Perspectivas</h2>
          <ul className="space-y-2">
            {correlation.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-body-md">
                <span className="text-primary mt-1">•</span>
                <span className="text-on-surface">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {bioactives.length > 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-lg p-5">
          <h2 className="text-title-md text-on-surface mb-4">Historial de análisis</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  <th className="text-left font-label-caps text-9px text-on-surface-variant py-2">COMPUESTO</th>
                  <th className="text-left font-label-caps text-9px text-on-surface-variant py-2">CONCENTRACIÓN</th>
                  <th className="text-left font-label-caps text-9px text-on-surface-variant py-2">FUENTE</th>
                  <th className="text-left font-label-caps text-9px text-on-surface-variant py-2">FECHA</th>
                  <th className="text-left font-label-caps text-9px text-on-surface-variant py-2">NOTAS</th>
                </tr>
              </thead>
              <tbody>
                {bioactives.map(b => (
                  <tr key={b.id} className="border-b border-outline-variant/20">
                    <td className="py-2 text-on-surface">{b.compoundName}</td>
                    <td className="py-2 text-on-surface font-mono">{b.concentration} {b.unit}</td>
                    <td className="py-2 text-on-surface-variant">{b.labSource || '—'}</td>
                    <td className="py-2 text-on-surface-variant">{new Date(b.analysisDate).toLocaleDateString()}</td>
                    <td className="py-2 text-on-surface-variant max-w-[200px] truncate">{b.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bioactives.length === 0 && !showAddForm && (
        <div className="bg-surface-container border border-outline-variant rounded-lg p-8 text-center">
          <p className="text-on-surface-variant">Sin análisis de bioactivos registrados para este ciclo.</p>
          <p className="text-body-sm text-on-surface-variant mt-2">Haga clic en "+ AGREGAR ANÁLISIS" para registrar resultados de laboratorio.</p>
        </div>
      )}
    </div>
  )
}
