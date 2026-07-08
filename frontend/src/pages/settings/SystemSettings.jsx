import { useState, useEffect } from 'react'
import { getDevices } from '../../api/client.js'
import ToggleSwitch from '../../components/ui/ToggleSwitch.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

function SystemSettings() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  async function loadData() {
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

  useEffect(() => { loadData() }, [])

  function toggleTheme(val) {
    const t = val ? 'dark' : 'light'
    setTheme(t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    localStorage.setItem('theme', t)
  }

  if (loading) return <LoadingState message="Loading system configuration..." icon="palette" />
  if (error) return <ErrorState message={error} onRetry={loadData} />

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-1">System Configuration</h1>
        <p className="text-on-surface-variant text-body-md">Theme, display, network and general system preferences.</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 md:col-span-4 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary">id_card</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">GENERAL</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">NODE ID</p>
              <p className="font-mono text-headline-sm text-secondary tracking-widest">{devices[0]?.deviceId || 'MUSH-PRIME-001'}</p>
            </div>
            <div>
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">OPERATIONAL STATUS</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary breathing-pulse" />
                <span className="font-mono text-data-sm text-primary">ACTIVE</span>
              </div>
            </div>
            <div>
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">OS VERSION</p>
              <p className="font-mono text-data-sm text-on-surface">{devices[0]?.firmwareVersion || 'BIO-OS v2.4.0-STABLE'}</p>
            </div>
            <div>
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">UPTIME</p>
              <p className="font-mono text-data-sm text-on-surface">{devices[0]?.uptime || '142h 22m 10s'}</p>
            </div>
          </div>
        </section>

        <section className="col-span-12 md:col-span-8 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-secondary">router</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">NETWORK & INFRASTRUCTURE</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border-l border-outline-variant">
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">IP ADDRESS</p>
              <p className="font-mono text-data-sm text-on-surface">{devices[0]?.ip || '192.168.1.144'}</p>
            </div>
            <div className="p-3 border-l border-outline-variant">
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">MAC ADDRESS</p>
              <p className="font-mono text-data-sm text-on-surface">{devices[0]?.mac || 'E4:5F:01:A2:33:9C'}</p>
            </div>
            <div className="p-3 border-l border-outline-variant">
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">SIGNAL STRENGTH</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-data-sm text-on-surface">{devices[0]?.rssi || '-42'} dBm</span>
                <div className="flex gap-0.5">
                  {[2, 3, 4, 5].map(h => (
                    <div key={h} className="w-1 rounded-sm" style={{ height: `${h*4}px`, background: h < 5 ? 'var(--primary)' : 'var(--outline-variant)' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded border border-outline-variant mt-4">
            <div>
              <p className="font-label-caps text-9px text-on-surface-variant">MQTT BROKER ENDPOINT</p>
              <p className="font-mono text-data-sm text-on-surface">{devices[0]?.mqttEndpoint || 'mqtt://core-biosystems.mush2.internal:1883'}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-primary breathing-pulse" />
          </div>
        </section>

        <section className="col-span-12 md:col-span-5 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-secondary">palette</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">THEME & DISPLAY</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-body-md text-on-surface">Dark Mode</span>
              <ToggleSwitch checked={theme === 'dark'} onChange={v => toggleTheme(v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-md text-on-surface">Ambient Animations</span>
              <ToggleSwitch checked={true} onChange={() => {}} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-md text-on-surface">Compact UI</span>
              <ToggleSwitch checked={false} onChange={() => {}} />
            </div>
            <div>
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">GLOW INTENSITY</p>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" defaultValue="72" className="flex-1 h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary" />
                <span className="font-mono text-data-sm text-secondary w-10 text-right">72%</span>
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-12 md:col-span-7 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary">health_and_safety</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">DIAGNOSTICS</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-data-sm text-on-surface">CPU Core Temp</span>
                <span className="font-mono text-data-sm text-primary">{devices[0]?.cpuTemp || '42'}°C</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded"><div className="bg-primary h-1 rounded" style={{ width: '45%' }} /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-data-sm text-on-surface">SRAM Usage</span>
                <span className="font-mono text-data-sm text-tertiary">{devices[0]?.sramUsage || '84'}%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded"><div className="bg-tertiary h-1 rounded" style={{ width: '84%' }} /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-data-sm text-on-surface">Flash Storage</span>
                <span className="font-mono text-data-sm text-on-surface">{devices[0]?.flashFree || '1.2'}GB Free</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded"><div className="bg-secondary h-1 rounded" style={{ width: '30%' }} /></div>
            </div>
          </div>
        </section>

        <section className="col-span-12 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-secondary">language</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">PREFERENCES</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">LANGUAGE</p>
              <select className="w-full bg-surface-container-low border border-outline-variant rounded text-body-md text-on-surface px-3 py-2">
                <option>English (US)</option>
                <option>Español</option>
                <option>Français</option>
                <option>Deutsch</option>
              </select>
            </div>
            <div>
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">TIMEZONE</p>
              <select className="w-full bg-surface-container-low border border-outline-variant rounded text-body-md text-on-surface px-3 py-2">
                <option>UTC (Universal)</option>
                <option>America/New_York (EST)</option>
                <option>Europe/London (GMT)</option>
                <option>Asia/Tokyo (JST)</option>
              </select>
            </div>
            <div>
              <p className="font-label-caps text-9px text-on-surface-variant mb-1">DATE FORMAT</p>
              <select className="w-full bg-surface-container-low border border-outline-variant rounded text-body-md text-on-surface px-3 py-2">
                <option>YYYY-MM-DD</option>
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SystemSettings
