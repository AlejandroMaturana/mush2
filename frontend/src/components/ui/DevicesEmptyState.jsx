function DevicesEmptyState({ onConnect }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto gap-6 py-16">
      <div className="w-64 h-64 rounded-xl overflow-hidden border border-primary/20 flex items-center justify-center bg-surface-container-low"
        style={{ boxShadow: '0 0 12px rgba(74,222,128,0.2)' }}>
        <span className="material-symbols-outlined text-96px text-on-surface-variant opacity-20" style={{ fontVariationSettings: '"FILL" 1' }}>sensors_off</span>
      </div>
      <div className="space-y-2">
        <h2 className="text-headline-lg text-3xl text-primary font-bold tracking-tight">SYSTEMS OFFLINE</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">
          No bio-nodes detected in the local mycelium network. Establish a connection to begin monitoring Chamber environmentals.
        </p>
      </div>
      <button
        onClick={onConnect}
        className="btn btn-primary"
        style={{ padding: '12px 32px', boxShadow: '0 0 12px rgba(74,222,128,0.2)' }}
      >
        CONNECT DEVICE
      </button>
    </div>
  )
}

export default DevicesEmptyState
