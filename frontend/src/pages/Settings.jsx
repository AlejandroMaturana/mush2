import { useAuth } from '../api/AuthContext.jsx'

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer" style={{ cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer breathing-toggle" />
      <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all toggle-bg" />
    </label>
  )
}

function Settings() {
  const { user, logout } = useAuth()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-headline-lg text-on-surface mb-1">System Configuration</h1>
        <p className="text-on-surface-variant text-body-md max-w-2xl">
          Modify core bio-engine parameters and network protocols.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-7 glass-panel rounded-lg p-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary">lan</span>
            <h3 className="font-label-caps text-label-caps text-secondary">NETWORK CONFIGURATION</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant opacity-70 block mb-1">MAC ADDRESS</label>
              <div className="bg-surface-container-lowest border border-outline-variant rounded p-2">
                <input className="w-full bg-transparent border-none text-data-sm text-primary p-0" readOnly value="3E:22:FB:4A:91:0C" style={{ outline: 'none' }} />
              </div>
            </div>
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant opacity-70 block mb-1">IP ADDRESS (STATIC)</label>
              <div className="bg-surface-container-lowest border border-outline-variant rounded p-2">
                <input className="w-full bg-transparent border-none text-data-sm text-primary p-0" defaultValue="192.168.1.142" style={{ outline: 'none' }} />
              </div>
            </div>
            <div className="md:col-span-2 mt-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant opacity-70 block mb-1">MQTT BROKER ENDPOINT</label>
              <div className="bg-surface-container-lowest border border-outline-variant rounded p-2">
                <input className="w-full bg-transparent border-none text-data-sm text-primary p-0" defaultValue="mqtt://core-biosystems.mush2.internal:1883" style={{ outline: 'none' }} />
              </div>
            </div>
            <div className="md:col-span-2 flex items-center justify-between py-2 border-t border-outline-variant mt-4">
              <div>
                <h4 className="text-body-md text-on-surface">Auto-Discovery</h4>
                <p className="text-data-sm text-on-surface-variant">Broadcast presence to local mycelium nodes</p>
              </div>
              <Toggle />
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-5 glass-panel rounded-lg p-4 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary">sensors</span>
            <h3 className="font-label-caps text-label-caps text-primary">SENSOR CALIBRATION</h3>
          </div>
          <div className="space-y-6 flex-1">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant">HYPHAE HUMIDITY OFFSET</label>
                <span className="text-data-sm text-primary">+2.4%</span>
              </div>
              <input type="range" min="-10" max="10" step="0.1" defaultValue="2.4" className="w-full" style={{ accentColor: 'var(--spore-green)' }} />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant">THERMAL THRESHOLD</label>
                <span className="text-data-sm text-primary">28.5°C</span>
              </div>
              <input type="range" min="15" max="40" step="0.5" defaultValue="28.5" className="w-full" style={{ accentColor: 'var(--spore-green)' }} />
            </div>
            <div className="p-3 bg-surface-container-low border border-outline-variant rounded mt-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber text-lg">warning</span>
                <div>
                  <h4 className="font-label-caps text-data-sm text-amber">CALIBRATION ADVISORY</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Deviations beyond 15% from baselines may trigger emergency ventilation protocols.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button
            className="w-full mt-6 py-2 border border-primary text-primary font-label-caps text-10px rounded hover:bg-primary hover:text-on-primary transition-all"
            style={{ background: 'none', cursor: 'pointer' }}>
            RUN DIAGNOSTICS
          </button>
        </section>

        <section className="col-span-12 lg:col-span-6 glass-panel rounded-lg p-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary">security</span>
            <h3 className="font-label-caps text-label-caps text-secondary">BIO-ARCHITECT PERMISSIONS</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-surface-container-highest/30 border border-outline-variant rounded">
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
          <button className="w-full mt-6 py-2 bg-surface-container-high text-on-surface font-label-caps text-10px rounded hover:bg-surface-bright transition-all flex items-center justify-center gap-2"
            style={{ border: 'none', cursor: 'pointer' }}>
            <span className="material-symbols-outlined text-sm">add</span>
            PROVISION NEW ACCESS
          </button>
        </section>

        <section className="col-span-12 lg:col-span-6 glass-panel rounded-lg p-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary">palette</span>
            <h3 className="font-label-caps text-label-caps text-primary">ACCOUNT</h3>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
              <div className="flex-1">
                <span className="font-label-caps text-9px text-on-surface-variant">USERNAME</span>
                <p className="text-body-md text-on-surface">{user?.username || '—'}</p>
              </div>
            </div>
            <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">email</span>
              <div className="flex-1">
                <span className="font-label-caps text-9px text-on-surface-variant">EMAIL</span>
                <p className="text-body-md text-on-surface">{user?.email || '—'}</p>
              </div>
            </div>
            <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">badge</span>
              <div className="flex-1">
                <span className="font-label-caps text-9px text-on-surface-variant">ROLE</span>
                <p className="text-body-md text-on-surface">{user?.role || '—'}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="col-span-12 flex flex-col md:flex-row items-center justify-between bg-surface-container-high p-4 rounded-lg border border-primary/20">
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
            <button
              onClick={logout}
              className="px-6 py-2 bg-error/20 text-error font-label-caps text-10px rounded hover:bg-error/30 transition-colors"
              style={{ border: 'none', cursor: 'pointer' }}>
              LOG OUT
            </button>
            <button className="px-8 py-2 bg-primary text-on-primary font-label-caps text-10px rounded hover:brightness-110 active:scale-95 transition-all"
              style={{ border: 'none', cursor: 'pointer', boxShadow: '0 0 15px rgba(107,251,154,0.3)' }}>
              COMMIT TO CORE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
