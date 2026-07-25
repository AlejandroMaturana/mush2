import { useState } from 'react'

function RecipeForm({ species = [], onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    speciesId: '',
    difficulty: 'BEGINNER',
    expectedYield: '',
    phases: [
      { name: 'Incubación', durationDays: 14, targetTemp: 24, targetHumidity: 85, targetCo2: 1000 },
      { name: 'Fructificación', durationDays: 10, targetTemp: 22, targetHumidity: 90, targetCo2: 800 },
    ],
  })

  function updatePhase(idx, field, value) {
    setForm(f => ({
      ...f,
      phases: f.phases.map((p, i) => i === idx ? { ...p, [field]: value } : p),
    }))
  }

  function addPhase() {
    setForm(f => ({
      ...f,
      phases: [...f.phases, { name: `Fase ${f.phases.length + 1}`, durationDays: 7, targetTemp: 22, targetHumidity: 85, targetCo2: 1000 }],
    }))
  }

  function removePhase(idx) {
    setForm(f => ({
      ...f,
      phases: f.phases.filter((_, i) => i !== idx),
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit?.({
      ...form,
      expectedYield: form.expectedYield ? Number(form.expectedYield) : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-label-caps text-9px text-on-surface-variant block mb-1">NOMBRE</label>
          <input className="input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="font-label-caps text-9px text-on-surface-variant block mb-1">ESPECIE</label>
          <select className="select w-full" value={form.speciesId} onChange={e => setForm(f => ({ ...f, speciesId: e.target.value }))}>
            <option value="">Ninguna</option>
            {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
          </select>
        </div>
        <div>
          <label className="font-label-caps text-9px text-on-surface-variant block mb-1">DIFICULTAD</label>
          <select className="select w-full" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
            <option value="BEGINNER">Principiante</option>
            <option value="INTERMEDIATE">Intermedio</option>
            <option value="ADVANCED">Avanzado</option>
          </select>
        </div>
        <div>
          <label className="font-label-caps text-9px text-on-surface-variant block mb-1">RENDIMIENTO ESPERADO (g)</label>
          <input type="number" className="input w-full" value={form.expectedYield} onChange={e => setForm(f => ({ ...f, expectedYield: e.target.value }))} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="chart-panel-label">FASES</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={addPhase}>
            <span className="material-symbols-outlined text-12px">add</span> Agregar fase
          </button>
        </div>
        <div className="space-y-2">
          {form.phases.map((phase, idx) => (
            <div key={idx} className="p-3 bg-surface-container-low rounded-lg grid grid-cols-5 gap-2 items-end">
              <div>
                <label className="font-label-caps text-8px text-on-surface-variant block mb-0.5">Nombre</label>
                <input className="input w-full text-10px" value={phase.name} onChange={e => updatePhase(idx, 'name', e.target.value)} />
              </div>
              <div>
                <label className="font-label-caps text-8px text-on-surface-variant block mb-0.5">Días</label>
                <input type="number" className="input w-full text-10px" value={phase.durationDays} onChange={e => updatePhase(idx, 'durationDays', Number(e.target.value))} />
              </div>
              <div>
                <label className="font-label-caps text-8px text-on-surface-variant block mb-0.5">Temp °C</label>
                <input type="number" step="0.1" className="input w-full text-10px" value={phase.targetTemp} onChange={e => updatePhase(idx, 'targetTemp', Number(e.target.value))} />
              </div>
              <div>
                <label className="font-label-caps text-8px text-on-surface-variant block mb-0.5">Humedad %</label>
                <input type="number" className="input w-full text-10px" value={phase.targetHumidity} onChange={e => updatePhase(idx, 'targetHumidity', Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <label className="font-label-caps text-8px text-on-surface-variant block mb-0.5">CO₂ ppm</label>
                  <input type="number" className="input w-full text-10px" value={phase.targetCo2} onChange={e => updatePhase(idx, 'targetCo2', Number(e.target.value))} />
                </div>
                {form.phases.length > 1 && (
                  <button type="button" className="btn-icon text-error" onClick={() => removePhase(idx)}>
                    <span className="material-symbols-outlined text-14px">close</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>}
        <button type="submit" className="btn btn-primary">Guardar receta</button>
      </div>
    </form>
  )
}

export default RecipeForm
