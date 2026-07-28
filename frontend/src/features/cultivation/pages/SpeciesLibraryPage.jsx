import { useState, useEffect, useCallback } from 'react'
import { getSpeciesCatalog } from '../api/species.js'
import SpeciesCard from '../components/SpeciesCard.jsx'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'

const CLASS_LABELS = {
  Medicinal: { label: 'Medicinal', color: '#60a5fa' },
  'Comestible': { label: 'Comestible', color: '#4ade80' },
  'Comestible / Medicinal': { label: 'Comestible / Medicinal', color: '#a78bfa' },
  Adaptógeno: { label: 'Adaptógeno', color: '#c084fc' },
}

const DIFFICULTY_META = {
  BEGINNER: { label: 'Principiante', segments: 1 },
  INTERMEDIATE: { label: 'Intermedio', segments: 2 },
  ADVANCED: { label: 'Avanzado', segments: 3 },
}

const TOTAL_SEGMENTS = 4

function DifficultyIndicator({ level }) {
  const meta = DIFFICULTY_META[level] || DIFFICULTY_META.BEGINNER
  return (
    <div className="species-difficulty-row">
      <div className="species-dna-segments">
        {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
          <span
            key={i}
            className={`species-dna-segment ${i < meta.segments ? 'active' : ''}`}
          />
        ))}
      </div>
      <span className="species-difficulty-label">{meta.label}</span>
    </div>
  )
}

function SpeciesLibraryPage() {
  const [species, setSpecies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ adapterClass: '', difficultyLevel: '', q: '' })
  const [selectedId, setSelectedId] = useState(null)
  const [imgErrors, setImgErrors] = useState({})

  const load = useCallback(async () => {
    try {
      setError(null)
      const params = {}
      if (filters.adapterClass) params.adapterClass = filters.adapterClass
      if (filters.difficultyLevel) params.difficultyLevel = filters.difficultyLevel
      if (filters.q) params.q = filters.q
      const data = await getSpeciesCatalog(params)
      setSpecies(data)
    } catch (err) {
      setError(err.message || 'Error al cargar especies')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingState message="Cargando biblioteca de especies..." icon="potted_plant" />

  return (
    <div className="species-library">
      <EntityHeader
        title="Biblioteca de especies"
        subtitle={`${species.length} especie${species.length !== 1 ? 's' : ''}`}
      />

      {error && (
        <div className="alert-banner alert-banner-error">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <div className="species-filters">
        <div className="species-search-wrapper">
          <span className="material-symbols-outlined species-search-icon">search</span>
          <input
            type="text"
            className="species-search-input"
            placeholder="Buscar por nombre..."
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
          />
        </div>
        <select
          value={filters.adapterClass}
          onChange={e => setFilters(f => ({ ...f, adapterClass: e.target.value }))}
          className="form-select species-filter-select"
        >
          <option value="">Todas las clases</option>
          <option value="Medicinal">Medicinal</option>
          <option value="Comestible">Comestible</option>
          <option value="Comestible / Medicinal">Comestible / Medicinal</option>
          <option value="Adaptógeno">Adaptógeno</option>
        </select>
        <select
          value={filters.difficultyLevel}
          onChange={e => setFilters(f => ({ ...f, difficultyLevel: e.target.value }))}
          className="form-select species-filter-select"
        >
          <option value="">Todos los niveles</option>
          <option value="BEGINNER">Principiante</option>
          <option value="INTERMEDIATE">Intermedio</option>
          <option value="ADVANCED">Avanzado</option>
        </select>
      </div>

      {species.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px', display: 'block' }}>potted_plant</span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Sin especies registradas</h3>
          <p style={{ fontSize: '13px', color: 'var(--outline)' }}>Ejecute el script de datos iniciales para poblar la biblioteca.</p>
        </div>
      ) : (
        <div className="species-grid">
          {species.map(sp => {
            const classInfo = CLASS_LABELS[sp.adapterClass] || { label: sp.adapterClass, color: 'var(--outline)' }
            return (
              <button
                key={sp.id}
                type="button"
                className="species-catalog-card"
                onClick={() => setSelectedId(sp.id)}
              >
                <div className="species-card-image-wrap">
                  {sp.imageUrl && !imgErrors[sp.id] ? (
                    <img
                      src={sp.imageUrl}
                      alt={sp.name}
                      className="species-card-image"
                      loading="lazy"
                      onError={() => setImgErrors(prev => ({ ...prev, [sp.id]: true }))}
                    />
                  ) : (
                    <div className="species-card-image-placeholder">
                      <span className="material-symbols-outlined">potted_plant</span>
                    </div>
                  )}
                  <span
                    className="species-card-class-badge"
                    style={{ background: `${classInfo.color}20`, color: classInfo.color, borderColor: `${classInfo.color}40` }}
                  >
                    {classInfo.label}
                  </span>
                </div>

                <div className="species-card-body">
                  <div className="species-card-names">
                    <h3 className="species-card-name">{sp.name}</h3>
                    <p className="species-card-scientific">{sp.scientificName}</p>
                  </div>

                  <div className="species-card-meta">
                    <DifficultyIndicator level={sp.difficultyLevel} />
                    {sp.originClimate && (
                      <div className="species-card-climate">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>thermostat</span>
                        <span>{sp.originClimate}</span>
                      </div>
                    )}
                  </div>

                  {sp.shortDescription && (
                    <p className="species-card-desc">{sp.shortDescription}</p>
                  )}

                  <div className="species-card-footer">
                    <span className="species-card-detail-link">
                      VER DETALLES
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selectedId && (
        <SpeciesCard speciesId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

export default SpeciesLibraryPage
