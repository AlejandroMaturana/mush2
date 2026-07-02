import { useState, useEffect } from 'react'

function SystemAlert({ message = 'Biometric telemetry streams have been interrupted.', onReconnect, onViewLogs }) {
  const [countdown, setCountdown] = useState(8)

  useEffect(() => {
    if (countdown <= 0) {
      setCountdown(8)
      if (onReconnect) onReconnect()
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, onReconnect])

  const circumference = 125.6
  const offset = circumference - (countdown / 8) * circumference

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-container-lowest/90 backdrop-blur-sm">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-error to-transparent opacity-70"
          style={{ animation: 'scan 4s linear infinite' }}
        />
      </div>
      <div className="relative max-w-xl w-full mx-6 p-stack-md flex flex-col items-center gap-8 text-center bg-surface-container-high border border-error-container rounded-lg"
        style={{ boxShadow: '0 0 20px rgba(147,0,10,0.2), 0 0 40px rgba(147,0,10,0.6)' }}
      >
        <div className="relative flex flex-col items-center justify-center h-24 w-full overflow-hidden">
          <div className="h-0.5 w-[200px] bg-error relative"
            style={{ boxShadow: '0 0 15px rgba(255,180,171,0.4)', animation: 'glitchWave 2s infinite linear' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-error text-64px opacity-20">leak_remove</span>
          </div>
        </div>
        <div className="space-y-stack-sm">
          <p className="font-label-caps text-label-caps text-error tracking-[0.3em]">CRITICAL ERROR :: CONNECTION_TIMEOUT</p>
          <p className="text-display-data text-32px md:text-display-data text-on-surface leading-tight">SERVER LINK SEVERED</p>
          <p className="text-body-md text-on-surface-variant max-w-sm mx-auto">{message}</p>
        </div>
        <div className="flex items-center gap-stack-md py-4 px-6 bg-error-container/20 rounded border border-error/30">
          <div className="flex flex-col items-start">
            <span className="font-label-caps text-label-caps text-error opacity-70">RETRY_PROTOCOL</span>
            <span className="text-display-data-mobile text-error" id="countdown">AUTO-RETRY IN {String(countdown).padStart(2, '0')}s</span>
          </div>
          <div className="w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-error/10" />
              <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-error transition-all duration-1000 ease-linear"
                strokeDasharray={circumference} strokeDashoffset={offset} />
            </svg>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-gutter w-full">
          <button
            onClick={() => { if (onReconnect) onReconnect() }}
            className="bg-error text-on-error font-label-caps text-label-caps py-3 px-8 rounded hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            FORCE RECONNECT
          </button>
          <button
            onClick={() => { if (onViewLogs) onViewLogs() }}
            className="border border-outline text-on-surface-variant font-label-caps text-label-caps py-3 px-8 rounded hover:bg-surface-container-higher active:scale-95 transition-all"
            style={{ cursor: 'pointer' }}
          >
            VIEW SYSTEM LOGS
          </button>
        </div>
        <div className="absolute top-2 left-2 w-4 h-4" style={{ borderTop: '2px solid rgba(255,180,171,0.5)', borderLeft: '2px solid rgba(255,180,171,0.5)' }} />
        <div className="absolute top-2 right-2 w-4 h-4" style={{ borderTop: '2px solid rgba(255,180,171,0.5)', borderRight: '2px solid rgba(255,180,171,0.5)' }} />
        <div className="absolute bottom-2 left-2 w-4 h-4" style={{ borderBottom: '2px solid rgba(255,180,171,0.5)', borderLeft: '2px solid rgba(255,180,171,0.5)' }} />
        <div className="absolute bottom-2 right-2 w-4 h-4" style={{ borderBottom: '2px solid rgba(255,180,171,0.5)', borderRight: '2px solid rgba(255,180,171,0.5)' }} />
      </div>
    </div>
  )
}

export default SystemAlert
