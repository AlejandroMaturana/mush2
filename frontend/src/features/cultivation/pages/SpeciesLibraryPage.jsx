import { useState, useEffect } from 'react'
import { getSpecies, getSpeciesById, getRecipes, createSpecies, updateSpecies, deleteSpecies } from '../../../api/client.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'
import EmptyState from '../../../shared/components/EmptyState.jsx'

const DIFFICULTY_LABELS = {
  BEGINNER: { label: 'Principiante', color: '#4ade80', icon: 'signal_1' },
  INTERMEDIATE: { label: 'Intermedio', color: '#fbbf24', icon: 'signal_2' },
  ADVANCED: { label: 'Avanzado', color: '#f87171', icon: 'signal_3' },
}

const CLASS_LABELS = {
  ADAPTOGEN: { label: 'Adaptógeno', color: '#a78bfa' },
  EDIBLE: { label: 'Comestible', color: '#4ade80' },
  MEDICINAL: { label: 'Medicinal', color: '#60a5fa' },
}

function CompoundsBadges({ compounds }) {
  if (!compounds || typeof compounds !== 'object') return null
  const entries = Object.entries(compounds).filter(([, v]) => v)
  if (entries.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {entries.map(([key, val]) => {
        const label = typeof val === 'boolean' ? key.replace(/([A-Z])/g, ' $1').trim() : `${key.replace(/([A-Z])/g, ' $1').trim()}: ${val}`
        return (
          <span key={key} style={{ padding: '2px 6px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple, #8b5cf6)', fontSize: '9px', borderRadius: '9999px', fontWeight: 600 }}>{label}</span>
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
  const [showForm, setShowForm] = useState(false)
  const [editingSpecies, setEditingSpecies] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    name: '', scientificName: '', adapterClass: 'ADAPTOGEN', difficultyLevel: 'BEGINNER',
    originClimate: '', description: '', compounds: {},
  })

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

  function resetForm() {
    setEditingSpecies(null)
    setForm({
      name: '', scientificName: '', adapterClass: 'ADAPTOGEN', difficultyLevel: 'BEGINNER',
      originClimate: '', description: '', compounds: {},
    })
  }

  function startEdit(sp) {
    setEditingSpecies(sp)
    setForm({
      name: sp.name || '', scientificName: sp.scientificName || '',
      adapterClass: sp.adapterClass || 'ADAPTOGEN', difficultyLevel: sp.difficultyLevel || 'BEGINNER',
      originClimate: sp.originClimate || '', description: sp.description || '',
      compounds: sp.compounds || {},
    })
    setSelectedSpecies(null)
    setShowForm(true)
  }

  async function handleCreateEdit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        name: form.name, scientificName: form.scientificName,
        adapterClass: form.adapterClass, difficultyLevel: form.difficultyLevel,
        originClimate: form.originClimate || null, description: form.description || null,
        compounds: Object.keys(form.compounds).length > 0 ? form.compounds : null,
      }
      if (editingSpecies) {
        await updateSpecies(editingSpecies.id, payload)
      } else {
        await createSpecies(payload)
      }
      setShowForm(false)
      resetForm()
      await load()
    } catch (err) {
      setError(err.message || `Error ${editingSpecies ? 'updating' : 'creating'} species`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selectedSpecies) return
    setDeleting(true)
    try {
      await deleteSpecies(selectedSpecies.id)
      setSelectedSpecies(null)
      setShowDeleteModal(false)
      await load()
    } catch (err) {
      setError(err.message || 'Error deleting species')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingState message="Cargando biblioteca de especies..." icon="potted_plant" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <EntityHeader
        title="Biblioteca de especies"
        subtitle={`${species.length} especie${species.length !== 1 ? 's' : ''}`}
        actions={
          <button onClick={() => { resetForm(); setShowForm(true) }} className="btn btn-glow" style={{ fontSize: '11px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            NUEVA ESPECIE
          </button>
        }
      />

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <select value={filters.adapterClass} onChange={e => setFilters({ ...filters, adapterClass: e.target.value })} className="form-select" style={{ fontSize: '11px' }}>
          <option value="">Todas las clases</option>
          <option value="ADAPTOGEN">Adaptógeno</option>
          <option value="EDIBLE">Comestible</option>
          <option value="MEDICINAL">Medicinal</option>
        </select>
        <select value={filters.difficultyLevel} onChange={e => setFilters({ ...filters, difficultyLevel: e.target.value })} className="form-select" style={{ fontSize: '11px' }}>
          <option value="">Todos los niveles</option>
          <option value="BEGINNER">Principiante</option>
          <option value="INTERMEDIATE">Intermedio</option>
          <option value="ADVANCED">Avanzado</option>
        </select>
      </div>

      {/* Species Cards */}
      {species.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px', display: 'block' }}>potted_plant</span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Sin especies registradas</h3>
          <p style={{ fontSize: '13px', color: 'var(--outline)' }}>Ejecute el script de datos iniciales o cree una nueva especie para poblar la biblioteca.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {species.map(sp => {
            const classInfo = CLASS_LABELS[sp.adapterClass] || {}
            const diffInfo = DIFFICULTY_LABELS[sp.difficultyLevel] || {}
            const recipeCount = getRecipesForSpecies(sp.id).length
            return (
              <button
                key={sp.id}
                onClick={() => handleSelect(sp)}
                className="glass-card"
                style={{
                  padding: '16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                  borderColor: selectedSpecies?.id === sp.id ? 'var(--spore-green)' : undefined,
                  boxShadow: selectedSpecies?.id === sp.id ? 'var(--glow-primary)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--outline)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.scientificName}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {diffInfo.icon && (
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: diffInfo.color }}>{diffInfo.icon}</span>
                    )}
                    <button onClick={e => { e.stopPropagation(); startEdit(sp) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--outline)' }}>edit</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, background: `${classInfo.color}20`, color: classInfo.color }}>
                    {classInfo.label || sp.adapterClass}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 600, color: diffInfo.color }}>
                    {diffInfo.label || sp.difficultyLevel}
                  </span>
                  {sp.originClimate && (
                    <span style={{ fontSize: '9px', color: 'var(--outline)' }}>• {sp.originClimate}</span>
                  )}
                </div>

                {sp.description && (
                  <p style={{ fontSize: '12px', color: 'var(--outline)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{sp.description}</p>
                )}

                <CompoundsBadges compounds={sp.compounds} />

                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: 'var(--outline)' }}>
                    {recipeCount} receta{recipeCount !== 1 ? 's' : ''}
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--outline)' }}>chevron_right</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Species Detail Modal */}
      {selectedSpecies && (
        <div className="modal-overlay" onClick={() => setSelectedSpecies(null)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)' }}>{selectedSpecies.name}</h2>
                <p style={{ fontSize: '12px', color: 'var(--outline)', fontStyle: 'italic' }}>{selectedSpecies.scientificName}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => startEdit(selectedSpecies)} className="btn btn-secondary" style={{ fontSize: '10px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                  EDITAR
                </button>
                <button onClick={() => { setShowDeleteModal(true) }} className="btn btn-danger" style={{ fontSize: '10px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                  ELIMINAR
                </button>
                <button onClick={() => setSelectedSpecies(null)} className="btn btn-ghost btn-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {detailLoading ? (
                <LoadingState message="Cargando detalles..." icon="hourglass_empty" />
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { label: 'Clase', value: CLASS_LABELS[selectedSpecies.adapterClass]?.label || selectedSpecies.adapterClass, color: CLASS_LABELS[selectedSpecies.adapterClass]?.color },
                      { label: 'Dificultad', value: DIFFICULTY_LABELS[selectedSpecies.difficultyLevel]?.label || selectedSpecies.difficultyLevel, color: DIFFICULTY_LABELS[selectedSpecies.difficultyLevel]?.color },
                      { label: 'Clima de origen', value: selectedSpecies.originClimate || '—' },
                    ].map((item, i) => (
                      <div key={i} style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '2px' }}>{item.label}</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: item.color || 'var(--on-surface)' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {selectedSpecies.description && (
                    <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{selectedSpecies.description}</p>
                  )}

                  <div>
                    <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Compuestos bioactivos</h3>
                    <CompoundsBadges compounds={selectedSpecies.compounds} />
                  </div>

                  {getRecipesForSpecies(selectedSpecies.id).length > 0 && (
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
                        Recetas disponibles ({getRecipesForSpecies(selectedSpecies.id).length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {getRecipesForSpecies(selectedSpecies.id).map(r => (
                          <div key={r.id} style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)' }}>{r.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '9px', color: 'var(--outline)', fontFamily: 'var(--font-mono)' }}>
                                <span>Inc: {r.incubationDurationDays}d</span>
                                <span>Frut: {r.fruitingDurationDays}d</span>
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
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm() }}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)' }}>{editingSpecies ? 'Editar especie' : 'Nueva especie'}</h2>
              <button onClick={() => { setShowForm(false); resetForm() }} className="btn btn-ghost btn-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
            <form onSubmit={handleCreateEdit} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Nombre</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="form-input" placeholder="Ej: Melena de León" />
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Nombre científico</label>
                  <input value={form.scientificName} onChange={e => setForm({ ...form, scientificName: e.target.value })} required className="form-input" style={{ fontStyle: 'italic' }} placeholder="Hericium erinaceus" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Clase</label>
                  <select value={form.adapterClass} onChange={e => setForm({ ...form, adapterClass: e.target.value })} className="form-select">
                    <option value="ADAPTOGEN">Adaptógeno</option>
                    <option value="EDIBLE">Comestible</option>
                    <option value="MEDICINAL">Medicinal</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Dificultad</label>
                  <select value={form.difficultyLevel} onChange={e => setForm({ ...form, difficultyLevel: e.target.value })} className="form-select">
                    <option value="BEGINNER">Principiante</option>
                    <option value="INTERMEDIATE">Intermedio</option>
                    <option value="ADVANCED">Avanzado</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Clima de origen</label>
                  <input value={form.originClimate} onChange={e => setForm({ ...form, originClimate: e.target.value })} className="form-input" placeholder="Ej: Templado" />
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Descripción</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="form-input" rows={3} placeholder="Descripción breve de la especie..." style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--outline-variant)' }}>
                <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="btn btn-secondary" style={{ fontSize: '11px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn btn-glow" style={{ fontSize: '11px' }}>{submitting ? '...' : editingSpecies ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && selectedSpecies && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--error-red)' }}>warning</span>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)', textAlign: 'center' }}>Eliminar especie</h2>
              <p style={{ fontSize: '13px', color: 'var(--outline)', textAlign: 'center', lineHeight: 1.5 }}>
                ¿Está seguro de que desea eliminar <strong style={{ color: 'var(--on-surface)' }}>{selectedSpecies.name}</strong> ({selectedSpecies.scientificName})?
                Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
                <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="btn btn-secondary" style={{ flex: 1, fontSize: '12px' }}>Cancelar</button>
                <button onClick={handleDelete} disabled={deleting} className="btn btn-danger" style={{ flex: 1, fontSize: '12px' }}>
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SpeciesLibrary
