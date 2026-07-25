import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRecipes, createRecipe, updateRecipe } from '../../../api/client.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import EmptyState from '../../../shared/components/EmptyState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'

const SPECIES_PRESETS = [
  { id: 'lions-mane', name: "Lion's Mane", species: 'Hericium erinaceus', icon: 'emoji_emotions', color: 'var(--accent-purple, #8b5cf6)', incubation: { tempMin: 21, tempMax: 24, humMin: 85, humMax: 95, co2Max: 1200, days: 14 }, fruiting: { tempMin: 18, tempMax: 22, humMin: 85, humMax: 95, co2Max: 600, days: 10 }, fae: { interval: 60, strategy: 'TIMER', level: 'MEDIUM' }, light: 12 },
  { id: 'blue-oyster', name: 'Blue Oyster', species: 'Pleurotus ostreatus', icon: 'water_drop', color: '#60a5fa', incubation: { tempMin: 22, tempMax: 26, humMin: 85, humMax: 95, co2Max: 1200, days: 10 }, fruiting: { tempMin: 15, tempMax: 20, humMin: 85, humMax: 95, co2Max: 600, days: 7 }, fae: { interval: 45, strategy: 'TIMER', level: 'HIGH' }, light: 12 },
  { id: 'pink-oyster', name: 'Pink Oyster', species: 'Pleurotus djamor', icon: 'water_drop', color: '#f472b6', incubation: { tempMin: 24, tempMax: 28, humMin: 85, humMax: 95, co2Max: 1200, days: 8 }, fruiting: { tempMin: 20, tempMax: 25, humMin: 85, humMax: 95, co2Max: 600, days: 5 }, fae: { interval: 45, strategy: 'TIMER', level: 'HIGH' }, light: 12 },
  { id: 'shiitake', name: 'Shiitake', species: 'Lentinula edodes', icon: 'forest', color: '#fbbf24', incubation: { tempMin: 22, tempMax: 26, humMin: 80, humMax: 90, co2Max: 1500, days: 14 }, fruiting: { tempMin: 15, tempMax: 20, humMin: 80, humMax: 90, co2Max: 800, days: 10 }, fae: { interval: 60, strategy: 'TIMER', level: 'MEDIUM' }, light: 12 },
  { id: 'reishi', name: 'Reishi', species: 'Ganoderma lucidum', icon: 'spa', color: '#f87171', incubation: { tempMin: 26, tempMax: 30, humMin: 85, humMax: 95, co2Max: 1200, days: 14 }, fruiting: { tempMin: 22, tempMax: 26, humMin: 85, humMax: 95, co2Max: 600, days: 21 }, fae: { interval: 90, strategy: 'CO2_TRIGGER', level: 'LOW' }, light: 12 },
  { id: 'king-oyster', name: 'King Oyster', species: 'Pleurotus eryngii', icon: 'yard', color: '#a3e635', incubation: { tempMin: 22, tempMax: 25, humMin: 85, humMax: 95, co2Max: 1200, days: 14 }, fruiting: { tempMin: 15, tempMax: 18, humMin: 80, humMax: 90, co2Max: 600, days: 10 }, fae: { interval: 60, strategy: 'TIMER', level: 'MEDIUM' }, light: 14 },
]

function PhaseTimeline({ incubationDays, fruitingDays }) {
  const total = (incubationDays || 0) + (fruitingDays || 0)
  if (total === 0) return null
  const incPct = Math.round(((incubationDays || 0) / total) * 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '2px', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${incPct}%`, background: 'var(--spore-green)', borderRadius: '4px 0 0 4px' }} />
        <div style={{ flex: 1, background: 'var(--teal)', borderRadius: '0 4px 4px 0' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)' }}>
        <span>Inc {incubationDays || 0}d</span>
        <span>Fru {fruitingDays || 0}d</span>
        <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{total}d</span>
      </div>
    </div>
  )
}

function PhaseSection({ title, icon, data, onChange }) {
  return (
    <div style={{ border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px', background: 'var(--surface-container)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--spore-green)' }}>{icon}</span>
        <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{title}</h4>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Temp °C</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input type="number" step="0.5" value={data.tempMin} onChange={e => onChange({ ...data, tempMin: e.target.value })} className="form-input" style={{ width: '50%', textAlign: 'center', fontSize: '12px' }} placeholder="Mín" />
            <input type="number" step="0.5" value={data.tempMax} onChange={e => onChange({ ...data, tempMax: e.target.value })} className="form-input" style={{ width: '50%', textAlign: 'center', fontSize: '12px' }} placeholder="Máx" />
          </div>
        </div>
        <div>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Humedad %</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input type="number" step="0.5" value={data.humMin} onChange={e => onChange({ ...data, humMin: e.target.value })} className="form-input" style={{ width: '50%', textAlign: 'center', fontSize: '12px' }} placeholder="Mín" />
            <input type="number" step="0.5" value={data.humMax} onChange={e => onChange({ ...data, humMax: e.target.value })} className="form-input" style={{ width: '50%', textAlign: 'center', fontSize: '12px' }} placeholder="Máx" />
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>CO₂ Máx</label>
          <input type="number" value={data.co2Max} onChange={e => onChange({ ...data, co2Max: e.target.value })} className="form-input" style={{ textAlign: 'center', fontSize: '12px' }} />
        </div>
        <div>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Días</label>
          <input type="number" value={data.days} onChange={e => onChange({ ...data, days: e.target.value })} className="form-input" style={{ textAlign: 'center', fontSize: '12px' }} />
        </div>
      </div>
    </div>
  )
}

function Recipes() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [form, setForm] = useState({
    name: '', species: '',
    incubation: { tempMin: '', tempMax: '', humMin: '', humMax: '', co2Max: 1200, days: '' },
    fruiting: { tempMin: '', tempMax: '', humMin: '', humMax: '', co2Max: 800, days: '' },
    faeInterval: 60, ventilationStrategy: 'TIMER', faeLevel: 'MEDIUM', lightCycle: 12,
  })

  async function load() {
    try {
      setError(null)
      const data = await getRecipes()
      setRecipes(data)
    } catch (err) {
      setError(err.message || 'Error al cargar las recetas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function applyPreset(preset) {
    setSelectedPreset(preset.id)
    setForm({
      name: preset.name, species: preset.species,
      incubation: { tempMin: preset.incubation.tempMin, tempMax: preset.incubation.tempMax, humMin: preset.incubation.humMin, humMax: preset.incubation.humMax, co2Max: preset.incubation.co2Max, days: preset.incubation.days },
      fruiting: { tempMin: preset.fruiting.tempMin, tempMax: preset.fruiting.tempMax, humMin: preset.fruiting.humMin, humMax: preset.fruiting.humMax, co2Max: preset.fruiting.co2Max, days: preset.fruiting.days },
      faeInterval: preset.fae.interval, ventilationStrategy: preset.fae.strategy, faeLevel: preset.fae.level, lightCycle: preset.light,
    })
  }

  function resetForm() {
    setSelectedPreset(null)
    setEditingRecipe(null)
    setForm({
      name: '', species: '',
      incubation: { tempMin: '', tempMax: '', humMin: '', humMax: '', co2Max: 1200, days: '' },
      fruiting: { tempMin: '', tempMax: '', humMin: '', humMax: '', co2Max: 800, days: '' },
      faeInterval: 60, ventilationStrategy: 'TIMER', faeLevel: 'MEDIUM', lightCycle: 12,
    })
  }

  function startEdit(recipe) {
    setEditingRecipe(recipe)
    setSelectedPreset(null)
    setForm({
      name: recipe.name || '', species: recipe.species || '',
      incubation: {
        tempMin: recipe.incubationTempMin || '', tempMax: recipe.incubationTempMax || '',
        humMin: recipe.incubationHumMin || '', humMax: recipe.incubationHumMax || '',
        co2Max: recipe.incubationCo2Max || 1200, days: recipe.incubationDurationDays || '',
      },
      fruiting: {
        tempMin: recipe.fruitingTempMin || '', tempMax: recipe.fruitingTempMax || '',
        humMin: recipe.fruitingHumMin || '', humMax: recipe.fruitingHumMax || '',
        co2Max: recipe.fruitingCo2Max || 800, days: recipe.fruitingDurationDays || '',
      },
      faeInterval: recipe.faeIntervalMinutes || 60, ventilationStrategy: recipe.ventilationStrategy || 'TIMER',
      faeLevel: recipe.faeLevel || 'MEDIUM', lightCycle: recipe.lightCycleHours || 12,
    })
    setShowForm(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        name: form.name, species: form.species,
        incubationTempMin: parseFloat(form.incubation.tempMin) || null, incubationTempMax: parseFloat(form.incubation.tempMax) || null,
        incubationHumMin: parseFloat(form.incubation.humMin) || null, incubationHumMax: parseFloat(form.incubation.humMax) || null,
        incubationCo2Max: parseInt(form.incubation.co2Max) || 1200, incubationDurationDays: parseInt(form.incubation.days) || null,
        fruitingTempMin: parseFloat(form.fruiting.tempMin) || null, fruitingTempMax: parseFloat(form.fruiting.tempMax) || null,
        fruitingHumMin: parseFloat(form.fruiting.humMin) || null, fruitingHumMax: parseFloat(form.fruiting.humMax) || null,
        fruitingCo2Max: parseInt(form.fruiting.co2Max) || 800, fruitingDurationDays: parseInt(form.fruiting.days) || null,
        faeIntervalMinutes: parseInt(form.faeInterval) || 60, ventilationStrategy: form.ventilationStrategy, faeLevel: form.faeLevel,
        lightCycleHours: parseInt(form.lightCycle) || 12,
      }
      if (editingRecipe) {
        await updateRecipe(editingRecipe.id, payload)
      } else {
        await createRecipe(payload)
      }
      setShowForm(false)
      resetForm()
      await load()
    } catch (err) {
      setError(err.message || `Error al ${editingRecipe ? 'actualizar' : 'crear'} la receta`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState message="Cargando recetas de cultivo..." icon="science" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <EntityHeader
        title="Recetas de cultivo"
        subtitle={`${recipes.length} receta${recipes.length !== 1 ? 's' : ''}`}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            {recipes.length >= 2 && (
              <Link to="/cultivation/recipes/compare" className="btn btn-secondary" style={{ fontSize: '11px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>compare</span>
                COMPARAR
              </Link>
            )}
            <button onClick={() => { resetForm(); setShowForm(true) }} className="btn btn-glow" style={{ fontSize: '11px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              NUEVA RECETA
            </button>
          </div>
        }
      />

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {recipes.length === 0 ? (
        <EmptyState
          icon="science"
          title="Sin recetas registradas"
          message="Cree su primera receta para definir los parámetros del ambiente de cultivo."
          action={{ label: 'NUEVA RECETA', onClick: () => { resetForm(); setShowForm(true) } }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {recipes.map(r => {
            const totalDays = (r.incubationDurationDays || 0) + (r.fruitingDurationDays || 0)
            return (
              <div key={r.id} className="glass-card" style={{ padding: '16px', transition: 'border-color 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--spore-green)', marginBottom: '2px' }}>{r.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--outline)', fontStyle: 'italic' }}>{r.species}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--on-surface-variant)', background: 'var(--surface-container)', padding: '2px 8px', borderRadius: '4px' }}>
                      {totalDays || '?'}d
                    </span>
                    <button onClick={() => startEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)' }}>edit</span>
                    </button>
                  </div>
                </div>
                <PhaseTimeline incubationDays={r.incubationDurationDays} fruitingDays={r.fruitingDurationDays} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', fontSize: '10px' }}>
                  {[
                    { icon: 'thermostat', color: '#60a5fa', text: `Inc: ${r.incubationTempMin || '?'}–${r.incubationTempMax || '?'}°C` },
                    { icon: 'thermostat', color: '#60a5fa', text: `Frut: ${r.fruitingTempMin || '?'}–${r.fruitingTempMax || '?'}°C` },
                    { icon: 'water_drop', color: '#22d3ee', text: `Inc: ${r.incubationHumMin || '?'}–${r.incubationHumMax || '?'}%` },
                    { icon: 'water_drop', color: '#22d3ee', text: `Frut: ${r.fruitingHumMin || '?'}–${r.fruitingHumMax || '?'}%` },
                    { icon: 'air', color: '#4ade80', text: `Ventilación: ${r.faeIntervalMinutes || '?'}min` },
                    { icon: 'light_mode', color: '#fbbf24', text: `Luz: ${r.lightCycleHours || 12}h` },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px', color: item.color }}>{item.icon}</span>
                      <span style={{ color: 'var(--on-surface-variant)' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)' }}>{editingRecipe ? 'Editar receta' : 'Nueva receta'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '8px' }}>Plantillas de especies</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {SPECIES_PRESETS.map(p => (
                    <button key={p.id} type="button" onClick={() => applyPreset(p)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px', borderRadius: '8px',
                      border: `1px solid ${selectedPreset === p.id ? 'var(--spore-green)' : 'var(--outline-variant)'}`,
                      background: selectedPreset === p.id ? 'rgba(var(--spore-green-rgb), 0.1)' : 'var(--surface-container)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: p.color }}>{p.icon}</span>
                      <span style={{ fontSize: '9px', color: 'var(--on-surface)', fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '8px' }}>Identificación</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Nombre</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="form-input" placeholder="Ej: Melena de León Estándar" />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Especie</label>
                    <input value={form.species} onChange={e => setForm({ ...form, species: e.target.value })} required className="form-input" style={{ fontStyle: 'italic' }} placeholder="Hericium erinaceus" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <PhaseSection title="Incubación" icon="science" data={form.incubation} onChange={d => setForm({ ...form, incubation: d })} />
                <PhaseSection title="Fructificación" icon="grass" data={form.fruiting} onChange={d => setForm({ ...form, fruiting: d })} />
              </div>

              <div>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '8px' }}>Parámetros ambientales</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Ventilación (min)</label>
                    <input type="number" value={form.faeInterval} onChange={e => setForm({ ...form, faeInterval: e.target.value })} className="form-input" style={{ textAlign: 'center', fontSize: '12px' }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Estrategia</label>
                    <select value={form.ventilationStrategy} onChange={e => setForm({ ...form, ventilationStrategy: e.target.value })} className="form-select" style={{ fontSize: '12px' }}>
                      <option value="TIMER">Temporizador</option>
                      <option value="CO2_TRIGGER">CO₂</option>
                      <option value="HYBRID">Híbrido</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Nivel de flujo</label>
                    <select value={form.faeLevel} onChange={e => setForm({ ...form, faeLevel: e.target.value })} className="form-select" style={{ fontSize: '12px' }}>
                      <option value="LOW">Bajo</option>
                      <option value="MEDIUM">Medio</option>
                      <option value="HIGH">Alto</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Luz (h)</label>
                    <input type="number" min="0" max="24" value={form.lightCycle} onChange={e => setForm({ ...form, lightCycle: e.target.value })} className="form-input" style={{ textAlign: 'center', fontSize: '12px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--outline-variant)' }}>
                <button type="button" onClick={resetForm} style={{ fontSize: '12px', color: 'var(--outline)', background: 'none', border: 'none', cursor: 'pointer' }}>Restablecer</button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary" style={{ fontSize: '11px' }}>Cancelar</button>
                  <button type="submit" disabled={submitting} className="btn btn-glow" style={{ fontSize: '11px' }}>{submitting ? '...' : editingRecipe ? 'Guardar' : 'Crear'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Recipes
