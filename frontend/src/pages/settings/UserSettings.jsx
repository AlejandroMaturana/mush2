import { useState, useEffect } from 'react'
import { useAuth } from '../../api/AuthContext.jsx'
import ToggleSwitch from '../../components/ui/ToggleSwitch.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

function UserSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [twoFA, setTwoFA] = useState(true)
  const [sessions] = useState([
    { id: 'MUSH_CORE_77', ip: '192.168.1.104', origin: 'Lab_Main_Console', activity: 'System Configuration Change', status: 'current', ts: '2024-10-12 08:42:12' },
    { id: 'MUSH_MOBILE_02', ip: '10.0.42.18', origin: 'Field_Tablet_Alpha', activity: 'Environment Scan Upload', status: 'active', ts: '2024-10-12 07:15:01' },
    { id: 'EXT_SAT_LINK', ip: '204.1.22.9', origin: 'Remote_Monitoring_Node', activity: 'Read-Only Telemetry Data', status: 'active', ts: '2024-10-11 23:59:59' },
  ])

  if (loading) return <LoadingState message="Loading user configuration..." />
  if (error) return <ErrorState message={error} onRetry={() => setError(null)} />

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-1">User Configuration</h1>
        <p className="text-on-surface-variant text-body-md">Profile, security credentials and access management.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="glass-card p-5 rounded-xl border border-outline-variant flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-secondary">badge</span>
            <h3 className="font-label-caps text-label-caps text-secondary">BIO-ENGINEER PROFILE</h3>
          </div>
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-lg border-2 border-primary/30 p-1 mb-4 bg-surface-container-low flex items-center justify-center">
              <span className="material-symbols-outlined text-48px text-primary">person</span>
            </div>
            <h4 className="text-headline-md text-on-surface">{user?.username || 'OPERATOR'}</h4>
            <p className="text-data-sm text-secondary">{user?.role || 'BIO-ARCHITECT'}</p>
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">CREDENTIALS</label>
              <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant font-data-sm text-primary">
                {user?.role?.toUpperCase() || 'LEVEL_04_ARCHITECT'}
              </div>
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">EMAIL</label>
              <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant font-data-sm text-on-surface flex items-center justify-between">
                <span>{user?.email || 'operator@mush2.bio'}</span>
                <span className="material-symbols-outlined text-on-surface-variant text-sm">edit</span>
              </div>
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">BIOGRAPHY</label>
              <textarea
                className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-body-md text-on-surface h-24 resize-none"
                defaultValue="Focused on optimizing mycelial networks for biocomputational data processing."
              />
            </div>
          </div>
        </section>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <section className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">security</span>
                <h3 className="font-label-caps text-label-caps text-secondary">SECURITY & CRYPTOGRAPHIC ACCESS</h3>
              </div>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-9px font-bold border border-primary/20">PROTECTION ACTIVE</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">fingerprint</span>
                  <div>
                    <p className="text-body-md text-on-surface font-semibold">2FA Authentication</p>
                    <p className="text-10px text-on-surface-variant">Biometric protection active</p>
                  </div>
                </div>
                <ToggleSwitch checked={twoFA} onChange={setTwoFA} />
              </div>
              <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">vpn_key</span>
                  <div>
                    <p className="text-body-md text-on-surface font-semibold">Crypto Keys</p>
                    <p className="text-10px text-on-surface-variant">4 active keys</p>
                  </div>
                </div>
                <button className="text-10px font-label-caps text-primary hover:underline">MANAGE</button>
              </div>
            </div>
          </section>

          <section className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex items-center gap-3 mb-5">
              <span className="material-symbols-outlined text-secondary">lan</span>
              <h3 className="font-label-caps text-label-caps text-secondary">SESSION TOPOLOGY & NETWORK TRACE</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-data-sm text-data-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant">
                    <th className="py-2 pr-4 font-label-caps text-10px">TERMINAL ID</th>
                    <th className="py-2 pr-4 font-label-caps text-10px">IP ADDRESS</th>
                    <th className="py-2 pr-4 font-label-caps text-10px">ACCESS ORIGIN</th>
                    <th className="py-2 pr-4 font-label-caps text-10px">ACTIVITY LOG</th>
                    <th className="py-2 font-label-caps text-10px text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-outline-variant/30 hover:bg-surface-container-high transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${s.status === 'current' ? 'bg-primary shadow-[0_0_6px_#4ade80]' : 'bg-outline-variant'}`} />
                          <span className="text-on-surface">{s.id}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-on-surface-variant">{s.ip}</td>
                      <td className="py-3 pr-4 text-on-surface-variant">{s.origin}</td>
                      <td className="py-3 pr-4 text-on-surface-variant">{s.activity}</td>
                      <td className="py-3 text-right">
                        {s.status === 'current'
                          ? <span className="text-primary text-10px font-bold">CURRENT</span>
                          : <button className="text-error text-10px font-bold hover:underline">TERMINATE</button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex items-center gap-3 mb-5">
              <span className="material-symbols-outlined text-secondary">tune</span>
              <h3 className="font-label-caps text-label-caps text-secondary">PREFERENCES</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-label-caps text-10px text-on-surface-variant block mb-1">LOCALE & LANGUAGE</label>
                <select className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2 text-body-md text-on-surface">
                  <option>Español</option>
                  <option>English</option>
                </select>
              </div>
              <div>
                <label className="font-label-caps text-10px text-on-surface-variant block mb-1">TIME ZONE</label>
                <div className="bg-surface-container-lowest p-2 border border-outline-variant rounded text-body-md text-on-surface flex justify-between items-center">
                  <span>UTC -05:00 Bogotá</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">schedule</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default UserSettings
