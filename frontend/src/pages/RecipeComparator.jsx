import { useState, useEffect } from 'react'
import { getRecipes } from '../api/client.js'
import LoadingState from '../components/ui/LoadingState.jsx'

const COMPARISON_FIELDS = [
  { key: 'incubationTempMin', label: 'Incubation Temp Min', unit: '°C', group: 'incubation' },
  { key: 'incubationTempMax', label: 'Incubation Temp Max', unit: '°C', group: 'incubation' },
  { key: 'incubationHumMin', label: 'Incubation Hum Min', unit: '%', group: 'incubation' },
  { key: 'incubationHumMax', label: 'Incubation Hum Max', unit: '%', group: 'incubation' },
  { key: 'incubationCo2Max', label: 'Incubation CO₂ Max', unit: 'ppm', group: 'incubation' },
  { key: 'incubationDurationDays', label: 'Incubation Days', unit: 'd', group: 'incubation' },
  { key: 'fruitingTempMin', label: 'Fruiting Temp Min', unit: '°C', group: 'fruiting' },
  { key: 'fruitingTempMax', label: 'Fruiting Temp Max', unit: '°C', group: 'fruiting' },
  { key: 'fruitingHumMin', label: 'Fruiting Hum Min', unit: '%', group: 'fruiting' },
  { key: 'fruitingHumMax', label: 'Fruiting Hum Max', unit: '%', group: 'fruiting' },
  { key: 'fruitingCo2Max', label: 'Fruiting CO₂ Max', unit: 'ppm', group: 'fruiting' },
  { key: 'fruitingDurationDays', label: 'Fruiting Days', unit: 'd', group: 'fruiting' },
  { key: 'faeIntervalMinutes', label: 'FAE Interval', unit: 'min', group: 'fae' },
  { key: 'ventilationStrategy', label: 'Ventilation', unit: '', group: 'fae' },
  { key: 'faeLevel', label: 'FAE Level', unit: '', group: 'fae' },
  { key: 'lightCycleHours', label: 'Light Cycle', unit: 'h', group: 'light' },
]

const GROUP_LABELS = {
  incubation: { label: 'Incubation', icon: 'thermostat', color: 'bg-primary/10 text-primary' },
  fruiting: { label: 'Fruiting', icon: 'water_drop', color: 'bg-blue-500/10 text-blue-400' },
  fae: { label: 'FAE', icon: 'air', color: 'bg-tertiary/10 text-tertiary' },
  light: { label: 'Light', icon: 'light_mode', color: 'bg-amber-500/10 text-amber-500' },
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

  if (loading) return <LoadingState message="Loading recipes..." icon="compare" />

  const selectedRecipes = getSelectedRecipes()

  return (
    <div className="flex flex-col h-full">
      <div className="pb-4 mb-4 border-b border-outline-variant/30">
        <h1 className="text-headline-lg text-on-surface">Recipe Comparator</h1>
        <p className="text-body-md text-on-surface-variant">Select 2-3 recipes to compare side by side</p>
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
          <p className="text-body-lg font-semibold">Select at least 2 recipes</p>
          <p className="text-body-sm opacity-60">Choose from the list above to start comparing</p>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 text-on-surface-variant font-label-caps text-8px sticky left-0 bg-surface z-10">
                  Parameter
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
