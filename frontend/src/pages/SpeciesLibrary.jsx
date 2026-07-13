import { useState, useEffect } from 'react'
import { getSpecies, getSpeciesById, getRecipes } from '../api/client.js'
import LoadingState from '../components/ui/LoadingState.jsx'

const DIFFICULTY_LABELS = {
  BEGINNER: { label: 'Principiante', color: 'text-green-500', icon: 'signal_1' },
  INTERMEDIATE: { label: 'Intermedio', color: 'text-amber-500', icon: 'signal_2' },
  ADVANCED: { label: 'Avanzado', color: 'text-red-500', icon: 'signal_3' },
}

const CLASS_LABELS = {
  ADAPTOGEN: { label: 'Adaptógeno', color: 'text-purple-400' },
  EDIBLE: { label: 'Comestible', color: 'text-green-400' },
  MEDICINAL: { label: 'Medicinal', color: 'text-blue-400' },
}

function CompoundsBadges({ compounds }) {
  if (!compounds || typeof compounds !== 'object') return null
  const entries = Object.entries(compounds).filter(([, v]) => v)
  if (entries.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, val]) => {
        const label = typeof val === 'boolean'
          ? key.replace(/([A-Z])/g, ' $1').trim()
          : `${key.replace(/([A-Z])/g, ' $1').trim()}: ${val}`
        return (
          <span key={key} className="px-1.5 py-0.5 bg-tertiary-container/30 text-tertiary text-7px rounded-full font-semibold">
            {label}
          </span>
        )
      })}
    </div>
  )
}

function SpeciesLibrary() {
  const [species, setSpecies] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSpecies, setSelectedSpecies] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filters, setFilters] = useState({ adapterClass: '', difficultyLevel: '' })

  async function load() {
    try {
      setError(null)
      const params = {}
      if (filters.adapterClass) params.adapterClass = filters.adapterClass
      if (filters.difficultyLevel) params.difficultyLevel = filters.difficultyLevel
      const [s, r] = await Promise.all([getSpecies(params), getRecipes()])
      setSpecies(s)
      setRecipes(r)
    } catch (err) {
      setError(err.message || 'Error loading species')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filters])

  async function handleSelect(sp) {
    setDetailLoading(true)
    try {
      const detail = await getSpeciesById(sp.id)
      setSelectedSpecies(detail)
    } catch (err) {
      setError(err.message || 'Error loading species detail')
    } finally {
      setDetailLoading(false)
    }
  }

  function getRecipesForSpecies(speciesId) {
    return recipes.filter(r => r.speciesId === speciesId)
  }

  if (loading) return <LoadingState message="Loading species library..." icon="potted_plant" />

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-end pb-4 mb-4 border-b border-outline-variant/30">
        <div>
          <h1 className="text-headline-lg text-on-surface">Species Library</h1>
          <p className="text-body-md text-on-surface-variant">{species.length} species</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filters.adapterClass}
            onChange={e => setFilters({ ...filters, adapterClass: e.target.value })}
            className="bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-data-sm focus:outline-none focus:border-primary"
          >
            <option value="">All classes</option>
            <option value="ADAPTOGEN">Adaptógeno</option>
            <option value="EDIBLE">Comestible</option>
            <option value="MEDICINAL">Medicinal</option>
          </select>
          <select
            value={filters.difficultyLevel}
            onChange={e => setFilters({ ...filters, difficultyLevel: e.target.value })}
            className="bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-data-sm focus:outline-none focus:border-primary"
          >
            <option value="">All levels</option>
            <option value="BEGINNER">Principiante</option>
            <option value="INTERMEDIATE">Intermedio</option>
            <option value="ADVANCED">Avanzado</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-error-container/10 border border-error/40 flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-18px">warning</span>
          <span className="text-data-sm text-error font-semibold">{error}</span>
        </div>
      )}

      {species.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined text-48px mb-3 opacity-40">potted_plant</span>
          <p className="text-body-lg font-semibold">No species found</p>
          <p className="text-body-sm opacity-60">Run the seed script to populate the species library</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {species.map(sp => {
            const classInfo = CLASS_LABELS[sp.adapterClass] || {}
            const diffInfo = DIFFICULTY_LABELS[sp.difficultyLevel] || {}
            const recipeCount = getRecipesForSpecies(sp.id).length
            return (
              <button
                key={sp.id}
                onClick={() => handleSelect(sp)}
                className={`glass-card p-4 rounded-xl border transition-all text-left hover:border-primary/40 ${
                  selectedSpecies?.id === sp.id ? 'border-primary shadow-md' : 'border-outline-variant'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-title-md text-on-surface truncate">{sp.name}</h3>
                    <p className="text-body-sm text-on-surface-variant italic truncate">{sp.scientificName}</p>
                  </div>
                  {diffInfo.icon && (
                    <span className={`material-symbols-outlined text-18px ${diffInfo.color}`}>{diffInfo.icon}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-1.5 py-0.5 rounded text-7px font-semibold ${
                    sp.adapterClass === 'MEDICINAL' ? 'bg-blue-500/20 text-blue-400'
                      : sp.adapterClass === 'EDIBLE' ? 'bg-green-500/20 text-green-400'
                        : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {classInfo.label || sp.adapterClass}
                  </span>
                  <span className={`text-7px font-semibold ${diffInfo.color}`}>
                    {diffInfo.label || sp.difficultyLevel}
                  </span>
                  {sp.originClimate && (
                    <span className="text-7px text-on-surface-variant">• {sp.originClimate}</span>
                  )}
                </div>

                {sp.description && (
                  <p className="text-body-sm text-on-surface-variant mb-2 line-clamp-2">{sp.description}</p>
                )}

                <CompoundsBadges compounds={sp.compounds} />

                <div className="mt-3 pt-2 border-t border-outline-variant/30 flex items-center justify-between">
                  <span className="text-7px text-on-surface-variant">
                    {recipeCount} recipe{recipeCount !== 1 ? 's' : ''}
                  </span>
                  <span className="material-symbols-outlined text-12px text-on-surface-variant">chevron_right</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selectedSpecies && (
        <SpeciesDetail
          species={selectedSpecies}
          recipes={getRecipesForSpecies(selectedSpecies.id)}
          onClose={() => setSelectedSpecies(null)}
          loading={detailLoading}
        />
      )}
    </div>
  )
}

function SpeciesDetail({ species, recipes, onClose, loading }) {
  const classInfo = CLASS_LABELS[species.adapterClass] || {}
  const diffInfo = DIFFICULTY_LABELS[species.difficultyLevel] || {}

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'color-mix(in srgb, rgba(0,0,0,0.6) 60%, transparent)', backdropFilter: 'blur(4px)' }}>
      <div className="relative bg-surface border border-outline-variant rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant">
          <div className="flex-1 min-w-0">
            <h2 className="text-title-lg text-on-surface">{species.name}</h2>
            <p className="text-body-sm text-on-surface-variant italic">{species.scientificName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-20px text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <LoadingState message="Loading details..." icon="hourglass_empty" />
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <div className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30">
                  <span className="font-label-caps text-8px text-on-surface-variant block">Class</span>
                  <span className="text-title-sm font-semibold">{classInfo.label || species.adapterClass}</span>
                </div>
                <div className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30">
                  <span className="font-label-caps text-8px text-on-surface-variant block">Difficulty</span>
                  <span className={`text-title-sm font-semibold ${diffInfo.color}`}>{diffInfo.label || species.difficultyLevel}</span>
                </div>
                <div className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30">
                  <span className="font-label-caps text-8px text-on-surface-variant block">Climate</span>
                  <span className="text-title-sm">{species.originClimate || '—'}</span>
                </div>
              </div>

              {species.description && (
                <p className="text-body-md text-on-surface-variant">{species.description}</p>
              )}

              <div>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-2">Compounds</h3>
                <CompoundsBadges compounds={species.compounds} />
              </div>

              {recipes.length > 0 && (
                <div>
                  <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-2">
                    Available Recipes ({recipes.length})
                  </h3>
                  <div className="space-y-2">
                    {recipes.map(r => (
                      <div key={r.id} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30">
                        <div className="flex items-center justify-between">
                          <span className="text-title-sm text-on-surface">{r.name}</span>
                          <div className="flex items-center gap-3 text-7px text-on-surface-variant">
                            <span>Inc: {r.incubationDurationDays}d</span>
                            <span>Frt: {r.fruitingDurationDays}d</span>
                            <span>CO₂: {r.fruitingCo2Max}ppm</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SpeciesLibrary
