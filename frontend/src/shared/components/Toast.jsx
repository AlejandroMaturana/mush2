import { useState, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext(null)

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'error', durationMs = 5000) => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type }])
    if (durationMs > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, durationMs)
    }
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {toasts.map(t => (
            <div
              key={t.id}
              role="alert"
              onClick={() => dismiss(t.id)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: t.type === 'error' ? 'rgba(239,68,68,0.95)' : t.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(59,130,246,0.95)',
                color: '#fff',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                maxWidth: '400px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
