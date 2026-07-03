import { useAuth } from '../api/AuthContext.jsx'

function Toggle({ checked, onChange, label }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer gap-3">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer breathing-toggle" />
      <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all toggle-bg" />
      {label && <span className="text-body-md text-on-surface">{label}</span>}
    </label>
  )
}

function Settings() {
  const { user, logout } = useAuth()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-1">System Configuration</h1>
        <p className="text-on-surface-variant text-body-md max-w-2xl">
          Modify core bio-engine parameters and network protocols.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 auto-rows-min">
        <section className="lg:col-span-2 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-secondary">lan</span>
            <h3 className="font-label-caps text-label-caps text-secondary">NETWORK CONFIGURATION</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">MAC ADDRESS</label>
              <input className="form-input" readOnly value="3E:22:FB:4A:91:0C" />
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">IP ADDRESS (STATIC)</label>
              <input className="form-input" defaultValue="192.168.1.142" />
            </div>
            <div className="md:col-span-2">
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">MQTT BROKER ENDPOINT</label>
              <input className="form-input" defaultValue="mqtt://core-biosystems.mush2.internal:1883" />
            </div>
            <div className="md:col-span-2 flex items-center justify-between py-3 border-t border-outline-variant mt-2">
              <div>
                <h4 className="text-body-md text-on-surface">Auto-Discovery</h4>
                <p className="text-data-sm text-on-surface-variant">Broadcast presence to local mycelium nodes</p>
              </div>
              <Toggle />
            </div>
          </div>
        </section>

        <section className="glass-card p-5 rounded-xl border border-outline-variant flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary">sensors</span>
            <h3 className="font-label-caps text-label-caps text-primary">SENSOR CALIBRATION</h3>
          </div>
          <div className="space-y-5 flex-1">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="font-label-caps text-10px text-on-surface-variant">HYPHAE HUMIDITY OFFSET</label>
                <span className="text-data-sm text-primary">+2.4%</span>
              </div>
              <input type="range" min="-10" max="10" step="0.1" defaultValue="2.4" className="range-slider" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="font-label-caps text-10px text-on-surface-variant">THERMAL THRESHOLD</label>
                <span className="text-data-sm text-primary">28.5°C</span>
              </div>
              <input type="range" min="15" max="40" step="0.5" defaultValue="28.5" className="range-slider" />
            </div>
            <div className="p-3 bg-surface-container-low border border-outline-variant rounded mt-2">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber text-lg">warning</span>
                <div>
                  <h4 className="font-label-caps text-9px text-amber">CALIBRATION ADVISORY</h4>
                  <p className="text-9px text-on-surface-variant mt-1 leading-relaxed">
                    Deviations beyond 15% from baselines may trigger emergency ventilation protocols.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button className="btn btn-secondary mt-5 w-full" style={{ borderColor: 'var(--spore-green)', color: 'var(--spore-green)' }}>
            RUN DIAGNOSTICS
          </button>
        </section>

        <section className="glass-card p-5 rounded-xl border border-outline-variant flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-secondary">palette</span>
            <h3 className="font-label-caps text-label-caps text-secondary">THEME & DISPLAY</h3>
          </div>
          <div className="space-y-5 flex-1">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="font-label-caps text-10px text-on-surface-variant">GLOW INTENSITY</label>
                <span className="text-data-sm text-secondary">72%</span>
              </div>
              <input type="range" min="0" max="100" step="1" defaultValue="72" className="range-slider" />
            </div>
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-body-md text-on-surface">Dark Mode</span>
                <Toggle checked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-md text-on-surface">Ambient Animations</span>
                <Toggle checked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-md text-on-surface">Compact UI</span>
                <Toggle />
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary">security</span>
            <h3 className="font-label-caps text-label-caps text-primary">BIO-ARCHITECT PERMISSIONS</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-surface-container-high/30 border border-outline-variant rounded">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div>
                  <h4 className="text-body-md font-semibold">{user?.username || 'User'}</h4>
                  <p className="font-label-caps text-9px text-secondary">LEVEL 04 | {user?.role || 'ARCHITECT'}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant" style={{ cursor: 'pointer' }}>more_vert</span>
            </div>
          </div>
          <button className="btn btn-surface mt-5 w-full">
            <span className="material-symbols-outlined text-sm">add</span>
            PROVISION NEW ACCESS
          </button>
        </section>

        <section className="lg:col-span-2 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-secondary">account_circle</span>
            <h3 className="font-label-caps text-label-caps text-secondary">ACCOUNT</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
              <div className="flex-1 min-w-0">
                <span className="font-label-caps text-9px text-on-surface-variant block">USERNAME</span>
                <p className="text-body-md text-on-surface truncate">{user?.username || '—'}</p>
              </div>
            </div>
            <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">email</span>
              <div className="flex-1 min-w-0">
                <span className="font-label-caps text-9px text-on-surface-variant block">EMAIL</span>
                <p className="text-body-md text-on-surface truncate">{user?.email || '—'}</p>
              </div>
            </div>
            <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">badge</span>
              <div className="flex-1 min-w-0">
                <span className="font-label-caps text-9px text-on-surface-variant block">ROLE</span>
                <p className="text-body-md text-on-surface truncate">{user?.role || '—'}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="lg:col-span-3 flex flex-col md:flex-row items-center justify-between bg-surface-container-high p-4 rounded-lg border border-primary/20">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="animate-pulse-slow">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>fiber_manual_record</span>
            </div>
            <div className="font-label-caps text-xs">
              <span className="text-on-surface-variant">SYSTEM STATUS:</span>
              <span className="text-primary ml-2">NOMINAL - ALL NODES SYNCHRONIZED</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={logout} className="btn btn-danger">
              LOG OUT
            </button>
            <button className="btn btn-primary" style={{ boxShadow: '0 0 15px var(--spore-glow)' }}>
              COMMIT TO CORE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
