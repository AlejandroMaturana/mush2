import { useState, useEffect } from 'react'
import { getRecipes } from '../../../api/client.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'

const COMPARISON_FIELDS = [
  { key: 'incubationTempMin', label: 'Temp. Mín Incubación', unit: '°C', group: 'incubation' },
  { key: 'incubationTempMax', label: 'Temp. Máx Incubación', unit: '°C', group: 'incubation' },
  { key: 'incubationHumMin', label: 'Hum. Mín Incubación', unit: '%', group: 'incubation' },
  { key: 'incubationHumMax', label: 'Hum. Máx Incubación', unit: '%', group: 'incubation' },
  { key: 'incubationCo2Max', label: 'CO₂ Máx Incubación', unit: 'ppm', group: 'incubation' },
  { key: 'incubationDurationDays', label: 'Días Incubación', unit: 'd', group: 'incubation' },
  { key: 'fruitingTempMin', label: 'Temp. Mín Fructificación', unit: '°C', group: 'fruiting' },
  { key: 'fruitingTempMax', label: 'Temp. Máx Fructificación', unit: '°C', group: 'fruiting' },
  { key: 'fruitingHumMin', label: 'Hum. Mín Fructificación', unit: '%', group: 'fruiting' },
  { key: 'fruitingHumMax', label: 'Hum. Máx Fructificación', unit: '%', group: 'fruiting' },
  { key: 'fruitingCo2Max', label: 'CO₂ Máx Fructificación', unit: 'ppm', group: 'fruiting' },
  { key: 'fruitingDurationDays', label: 'Días Fructificación', unit: 'd', group: 'fruiting' },
  { key: 'faeIntervalMinutes', label: 'Intervalo Ventilación', unit: 'min', group: 'fae' },
  { key: 'ventilationStrategy', label: 'Estrategia Ventilación', unit: '', group: 'fae' },
  { key: 'faeLevel', label: 'Nivel Flujo FAE', unit: '', group: 'fae' },
  { key: 'lightCycleHours', label: 'Ciclo de Luz', unit: 'h', group: 'light' },
]

const GROUP_LABELS = {
  incubation: { label: 'Incubación', icon: 'thermostat', color: 'bg-primary/10 text-primary' },
  fruiting: { label: 'Fructificación', icon: 'water_drop', color: 'bg-blue-500/10 text-blue-400' },
  fae: { label: 'Ventilación', icon: 'air', color: 'bg-tertiary/10 text-tertiary' },
  light: { label: 'Iluminación', icon: 'light_mode', color: 'bg-amber-500/10 text-amber-500' },
}

function RecipeComparator() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const data = await getRecipes()
        setRecipes(data)
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function toggleRecipe(id) {
    if (selected.includes(id)) {
      setSelected(selected.filter(x => x !== id))
    } else if (selected.length < 3) {
      setSelected([...selected, id])
    }
  }

  function getSelectedRecipes() {
    return recipes.filter(r => selected.includes(r.id))
  }

  function findDiff(field) {
    const vals = getSelectedRecipes().map(r => r[field])
    const unique = [...new Set(vals)]
    return unique.length > 1
  }

  if (loading) return <LoadingState message="Cargando comparador de recetas..." icon="compare" />

  const selectedRecipes = getSelectedRecipes()

  return (
    <div className="flex flex-col h-full">
      <div className="pb-4 mb-4 border-b border-outline-variant/30">
        <h1 className="text-headline-lg text-on-surface">Comparador de recetas</h1>
        <p className="text-body-md text-on-surface-variant">Seleccione entre 2 y 3 recetas para compararlas lado a lado</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {recipes.map(r => (
          <button
            key={r.id}
            onClick={() => toggleRecipe(r.id)}
            className={`px-3 py-1.5 rounded-lg text-data-sm border transition-all ${
              selected.includes(r.id)
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-low border-outline-variant hover:border-primary/40 text-on-surface'
            }`}
          >
            {r.name}
            {selected.includes(r.id) && (
              <span className="ml-1.5 text-7px opacity-80">
                ({selected.indexOf(r.id) + 1})
              </span>
            )}
          </button>
        ))}
      </div>

      {selectedRecipes.length < 2 ? (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined text-48px mb-3 opacity-40">compare</span>
          <p className="text-body-lg font-semibold">Seleccione al menos 2 recetas</p>
          <p className="text-body-sm opacity-60">Elija de la lista superior para comenzar la comparación</p>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 text-on-surface-variant font-label-caps text-8px sticky left-0 bg-surface z-10">
                  Parámetro
                </th>
                {selectedRecipes.map(r => (
                  <th key={r.id} className="text-center p-2 text-title-sm text-on-surface min-w-[150px]">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(GROUP_LABELS).map(([group, info]) => (
                <>
                  <tr key={`group-${group}`}>
                    <td colSpan={selectedRecipes.length + 1} className="pt-4 pb-1">
                      <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${info.color}`}>
                        <span className="material-symbols-outlined text-16px">{info.icon}</span>
                        <span className="font-label-caps text-label-caps">{info.label}</span>
                      </div>
                    </td>
                  </tr>
                  {COMPARISON_FIELDS.filter(f => f.group === group).map(field => (
                    <tr key={field.key} className="border-b border-outline-variant/30">
                      <td className="p-2 text-body-sm text-on-surface-variant sticky left-0 bg-surface z-10">
                        {field.label}
                      </td>
                      {selectedRecipes.map(r => {
                        const val = r[field.key]
                        const diff = findDiff(field.key)
                        return (
                          <td
                            key={r.id}
                            className={`p-2 text-center text-data-sm font-mono ${
                              diff ? 'bg-primary/5 font-semibold text-primary' : 'text-on-surface'
                            }`}
                          >
                            {val != null ? `${val}${field.unit}` : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default RecipeComparator
