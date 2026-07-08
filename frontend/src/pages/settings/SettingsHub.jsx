import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../api/AuthContext.jsx'
import { getDevices } from '../../api/client.js'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

const HUB_CARDS = [
  {
    to: '/settings/user',
    icon: 'fingerprint',
    title: 'User',
    subtitle: 'Profile, security & access',
    color: 'secondary',
  },
  {
    to: '/settings/device',
    icon: 'developer_board',
    title: 'Device',
    subtitle: 'Hardware, calibration & network',
    color: 'primary',
  },
  {
    to: '/settings/cultivation',
    icon: 'potted_plant',
    title: 'Cultivation',
    subtitle: 'Parameters, automation & alerts',
    color: 'tertiary',
  },
  {
    to: '/settings/system',
    icon: 'palette',
    title: 'System',
    subtitle: 'Theme, display & preferences',
    color: 'secondary',
  },
]

function SettingsHub() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchDevices() {
    try {
      const devs = await getDevices()
      setDevices(devs)
      setError(null)
    } catch (err) {
      setError(err.message || 'Connection error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  if (loading) return <LoadingState message="Loading system configuration..." icon="settings" />
  if (error) return <ErrorState message={error} onRetry={fetchDevices} />

  const onlineCount = devices.filter(d => d.status === 'ONLINE' || d.status !== 'OFFLINE').length

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-headline-lg text-on-surface mb-1">System Configuration</h1>
        <p className="text-on-surface-variant text-body-md max-w-2xl">
          Modify core bio-engine parameters and network protocols.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {HUB_CARDS.map(card => (
          <button
            key={card.to}
            onClick={() => navigate(card.to)}
            className="glass-card p-6 rounded-xl border border-outline-variant text-left cursor-pointer hover:bg-surface-container-high transition-all duration-300 group"
          >
            <div className={`w-12 h-12 rounded-lg bg-${card.color}/10 flex items-center justify-center mb-5`}>
              <span className={`material-symbols-outlined text-${card.color}`} style={{ fontVariationSettings: '"FILL" 1' }}>{card.icon}</span>
            </div>
            <h3 className="text-headline-md text-on-surface mb-1">{card.title}</h3>
            <p className="text-body-md text-on-surface-variant">{card.subtitle}</p>
            <div className="mt-4 flex items-center gap-2 text-10px font-label-caps text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <span>ACCESS PANEL</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between bg-surface-container-high p-4 rounded-lg border border-primary/20">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="animate-pulse-slow">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>fiber_manual_record</span>
          </div>
          <div className="font-label-caps text-xs">
            <span className="text-on-surface-variant">SYSTEM STATUS:</span>
            <span className="text-primary ml-2">NOMINAL — {onlineCount} OF {devices.length} NODES SYNCHRONIZED</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-10px font-label-caps text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {user?.username || 'OPERATOR'}
          </span>
          <span>FIRMWARE v2.4.0</span>
        </div>
      </div>
    </div>
  )
}

export default SettingsHub
