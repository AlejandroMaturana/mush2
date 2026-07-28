import { useState, useEffect, useRef } from 'react'
import { getSpecies } from '../api/species.js'

const CLASS_LABELS = {
  Medicinal: { label: 'Medicinal', color: '#60a5fa' },
  'Comestible': { label: 'Comestible', color: '#4ade80' },
  'Comestible / Medicinal': { label: 'Comestible / Medicinal', color: '#a78bfa' },
  Adaptógeno: { label: 'Adaptógeno', color: '#c084fc' },
}

const DIFFICULTY_LABELS = {
  BEGINNER: { label: 'Principiante', color: '#4ade80', segments: 1 },
  INTERMEDIATE: { label: 'Intermedio', color: '#fbbf24', segments: 2 },
  ADVANCED: { label: 'Avanzado', color: '#f87171', segments: 3 },
}

const TOTAL_SEGMENTS = 4

const PROPERTY_ICONS = ['security', 'psychology', 'vaccines', 'healing', 'favorite', 'monitor_heart']

function DifficultyBar({ level }) {
  const meta = DIFFICULTY_LABELS[level] || DIFFICULTY_LABELS.BEGINNER
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

function SpeciesCard({ speciesId, onClose }) {
  const [species, setSpecies] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [imgFailed, setImgFailed] = useState(false)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!speciesId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setImgFailed(false)
    getSpecies(speciesId)
      .then(data => { if (!cancelled) setSpecies(data) })
      .catch(err => { if (!cancelled) setError(err.message || 'Error al cargar detalle') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [speciesId])

  useEffect(() => {
    if (!speciesId) return
    const handleEsc = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [speciesId, onClose])

  if (!speciesId) return null

  const classInfo = species ? CLASS_LABELS[species.adapterClass] : null
  const attrs = species?.generalAttributes || {}

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose() }}>
      <div className="species-detail-modal" onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="species-detail-loading">
            <span className="material-symbols-outlined species-detail-loading-icon">hourglass_empty</span>
            <span className="species-detail-loading-text">Cargando ficha técnica...</span>
          </div>
        ) : error ? (
          <div className="species-detail-error">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--error-red)' }}>warning</span>
            <p style={{ fontSize: '14px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</p>
            <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: '8px' }}>Cerrar</button>
          </div>
        ) : species ? (
          <>
            <div className="species-detail-left">
              <div className="species-detail-image-wrap">
                {species.imageUrl && !imgFailed ? (
                  <img
                    src={species.imageUrl}
                    alt={species.name}
                    className="species-detail-image"
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <div className="species-detail-image-placeholder">
                    <span className="material-symbols-outlined">potted_plant</span>
                  </div>
                )}
                <div className="species-detail-image-gradient" />
                {classInfo && (
                  <span
                    className="species-detail-class-badge"
                    style={{ background: `${classInfo.color}20`, color: classInfo.color, borderColor: `${classInfo.color}40` }}
                  >
                    {classInfo.label}
                  </span>
                )}
              </div>

              <div className="species-detail-stats">
                <div className="species-stat-block">
                  <span className="species-stat-label">DIFICULTAD</span>
                  <DifficultyBar level={species.difficultyLevel} />
                </div>

                {species.originClimate && (
                  <div className="species-stat-block">
                    <span className="species-stat-label">CLIMA DE ORIGEN</span>
                    <div className="species-climate-display">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--teal)' }}>thermostat</span>
                      <span className="species-stat-value" style={{ fontSize: '16px' }}>{species.originClimate}</span>
                    </div>
                  </div>
                )}

                {attrs.ciclo_estimado_semanas && (
                  <div className="species-stat-block">
                    <span className="species-stat-label">CICLO DE CRECIMIENTO</span>
                    <div className="species-stat-value-row">
                      <span className="species-stat-value">{attrs.ciclo_estimado_semanas}</span>
                      <span className="species-stat-unit">semanas</span>
                    </div>
                  </div>
                )}

                {attrs.eficiencia_biologica_promedio && (
                  <div className="species-stat-block">
                    <span className="species-stat-label">EFICIENCIA BIOLÓGICA</span>
                    <span className="species-stat-value" style={{ color: 'var(--spore-green)' }}>{attrs.eficiencia_biologica_promedio}</span>
                  </div>
                )}

                {attrs.sustratos_compatibles?.length > 0 && (
                  <div className="species-stat-block">
                    <span className="species-stat-label">SUSTRATOS COMPATIBLES</span>
                    <div className="species-substrate-tags">
                      {attrs.sustratos_compatibles.map((s, i) => (
                        <span key={i} className="species-substrate-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="species-detail-right">
              <div className="species-detail-header">
                <div>
                  <h2 className="species-detail-name">{species.name}</h2>
                  <p className="species-detail-scientific">{species.scientificName}</p>
                </div>
                <button className="btn-ghost species-detail-close" onClick={onClose} aria-label="Cerrar">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="species-detail-content">
                {species.description && (
                  <div className="species-detail-description">
                    <p>{species.description}</p>
                  </div>
                )}

                <div className="species-detail-grid">
                  {species.MedicinalProperties?.length > 0 && (
                    <div className="species-detail-section">
                      <h4 className="species-section-title">PROPIEDADES MEDICINALES</h4>
                      <ul className="species-property-list">
                        {species.MedicinalProperties.map((prop, i) => (
                          <li key={prop.id || i} className="species-property-item">
                            <span className="material-symbols-outlined species-property-icon">
                              {PROPERTY_ICONS[i % PROPERTY_ICONS.length]}
                            </span>
                            <div className="species-property-text">
                              <span className="species-property-category">{prop.category}</span>
                              <span className="species-property-desc">{prop.description}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {species.BioactiveCompounds?.length > 0 && (
                    <div className="species-detail-section">
                      <h4 className="species-section-title">COMPUESTOS BIOACTIVOS</h4>
                      <div className="species-compounds-list">
                        {species.BioactiveCompounds.map((comp, i) => {
                          const pct = comp.value ? parseInt(comp.value) : null
                          return (
                            <div key={comp.id || i} className="species-compound-card">
                              <div className="species-compound-header">
                                <span className="species-compound-name">{comp.name}</span>
                                {comp.value && <span className="species-compound-value">{comp.value}</span>}
                              </div>
                              {pct !== null && !isNaN(pct) && (
                                <div className="species-compound-bar">
                                  <div className="species-compound-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default SpeciesCard
