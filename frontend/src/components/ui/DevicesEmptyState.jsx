import { useNavigate } from 'react-router-dom'

function DevicesEmptyState({ onConnect }) {
  const navigate = useNavigate()
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto gap-6 py-16">
      <div className="w-64 h-64 rounded-xl overflow-hidden border border-primary/20 flex items-center justify-center bg-surface-container-low"
        style={{ boxShadow: '0 0 12px var(--spore-glow)' }}>
        <span className="material-symbols-outlined text-96px text-on-surface-variant opacity-20" style={{ fontVariationSettings: '"FILL" 1' }}>sensors_off</span>
      </div>
      <div className="space-y-2">
        <h2 className="text-headline-lg text-3xl text-primary font-bold tracking-tight">SYSTEMS OFFLINE</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">
          No bio-nodes detected in the local mycelium network. Establish a connection to begin monitoring Chamber environmentals.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/provisioning')}
          className="btn btn-primary"
          style={{ boxShadow: '0 0 12px var(--spore-glow)' }}
        >
          <span className="material-symbols-outlined text-18px">add</span>
          ADD DEVICE
        </button>
        <button
          onClick={onConnect}
          className="glass-card px-4 py-3 rounded-xl border border-outline-variant text-on-surface"
        >
          RETRY
        </button>
      </div>
    </div>
  )
}

export default DevicesEmptyState
