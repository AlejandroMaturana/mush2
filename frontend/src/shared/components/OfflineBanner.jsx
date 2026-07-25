import { useState, useEffect } from 'react'

function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    function onOnline() { setOffline(false) }
    function onOffline() { setOffline(true) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-error/90 text-on-error">
      <span className="material-symbols-outlined text-sm">cloud_off</span>
      <span className="font-label-caps text-label-caps">CONEXIÓN INTERRUMPIDA — Los datos pueden no estar actualizados</span>
    </div>
  )
}

export default OfflineBanner
