import { useState } from 'react'

function OfflineOverlay({ lastSeen = '--:--:--', onRetry }) {
  const [retrying, setRetrying] = useState(false)

  function handleRetry() {
    setRetrying(true)
    if (onRetry) {
      onRetry()
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center max-w-md w-full px-8 py-10 bg-surface-container-low border border-outline rounded-lg shadow-2xl relative">
        <div className="absolute inset-0 bg-error/5 blur-3xl rounded-full" />
        <span className="material-symbols-outlined text-64px text-error mb-4 animate-pulse">cloud_off</span>
        <h1 className="text-headline-lg text-on-surface mb-2 tracking-tight">CONNECTION INTERRUPTED</h1>
        <p className="text-label-caps text-label-caps text-on-surface-variant text-center mb-8 uppercase">
          Handshake failed: Protocol Timeout 0x822
        </p>
        <div className="flex flex-col items-center gap-1 mb-10">
          <span className="font-label-caps text-label-caps text-on-surface-variant opacity-60">LAST SEEN</span>
          <span className="text-display-data text-display-data text-on-surface tracking-tighter">{lastSeen}</span>
          <span className="text-data-sm text-data-sm text-error/80 mt-1">SATELLITE LINK DOWN</span>
        </div>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="group relative px-8 py-4 bg-primary text-on-primary font-bold rounded flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
          style={{ border: 'none', cursor: retrying ? 'not-allowed' : 'pointer' }}
        >
          <span className={`material-symbols-outlined ${retrying ? 'animate-spin' : ''}`}>sync</span>
          <span className="font-label-caps text-label-caps">{retrying ? 'CONNECTING...' : 'RETRY CONNECTION'}</span>
          <div className="absolute inset-0 border border-primary/50 rounded animate-ping scale-110 opacity-0 group-hover:opacity-100" />
        </button>
      </div>
    </div>
  )
}

export default OfflineOverlay
