import { useState, useEffect } from 'react'
import { getSystemMetrics } from '../../api/client.js'

function StatusFooter() {
  const [osVer, setOsVer] = useState('—')

  useEffect(() => {
    getSystemMetrics()
      .then(d => setOsVer(d.versions?.os || '—'))
      .catch(() => setOsVer('—'))
  }, [])

  return (
    <footer className="status-footer">
      <span className="status-footer-left">Mush2 OS v{osVer} | SYS_UPTIME: --:--:--</span>
      <div className="status-footer-right">
        <span className="status-footer-link" style={{ cursor: 'pointer' }} title="Not available">DEBUG_CON</span>
        <span className="status-footer-link" style={{ cursor: 'pointer' }} title="Not available">FIRMWARE_PUSH</span>
      </div>
    </footer>
  )
}

export default StatusFooter
