import { useState } from 'react'
import { useAuth } from '../../api/AuthContext.jsx'
import ToggleSwitch from '../../components/ui/ToggleSwitch.jsx'

function UserSettings() {
  const { user } = useAuth()
  const [twoFA, setTwoFA] = useState(false)
  const [showModal, setShowModal] = useState(null)
  const [step, setStep] = useState(1)
  const [verifyCode, setVerifyCode] = useState('')
  const [backupCodes] = useState([
    '7F3A-2D91-B8C4', 'E5B2-9A17-4F60', 'C81D-3E56-A0F9',
    '4A7F-1B82-D0E3', 'F90C-6E41-2B75', '9812-D7AB-3F0E',
    'B3E4-50C2-9D16', '0F7A-68D1-4C53',
  ])
  const [sessions] = useState([
    { id: 'MUSH_CORE_77', ip: '192.168.1.104', origin: 'Lab_Main_Console', activity: 'System Configuration Change', status: 'current', ts: '2024-10-12 08:42:12' },
    { id: 'MUSH_MOBILE_02', ip: '10.0.42.18', origin: 'Field_Tablet_Alpha', activity: 'Environment Scan Upload', status: 'active', ts: '2024-10-12 07:15:01' },
    { id: 'EXT_SAT_LINK', ip: '204.1.22.9', origin: 'Remote_Monitoring_Node', activity: 'Read-Only Telemetry Data', status: 'active', ts: '2024-10-11 23:59:59' },
  ])

  function handleSetup() {
    setShowModal('setup')
    setStep(1)
    setVerifyCode('')
  }

  function handleDisable() {
    setShowModal('disable')
  }

  function confirmDisable() {
    setTwoFA(false)
    setShowModal(null)
  }

  function confirmSetup() {
    setTwoFA(true)
    setShowModal(null)
  }

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
              <span className={`px-2 py-0.5 rounded text-9px font-bold border ${twoFA ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface-container-high text-on-surface-variant border-outline-variant'}`}>
                {twoFA ? 'PROTECTION ACTIVE' : '2FA OFF'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">fingerprint</span>
                  <div className="flex-1">
                    <p className="text-body-md text-on-surface font-semibold">2FA Authentication</p>
                    <p className="text-10px text-on-surface-variant">{twoFA ? 'Two-factor authentication active' : 'Not configured'}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {twoFA ? (
                    <button onClick={handleDisable} className="text-10px font-label-caps text-error hover:underline">DISABLE</button>
                  ) : (
                    <button onClick={handleSetup} className="text-10px font-label-caps text-primary hover:underline">SET UP</button>
                  )}
                </div>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">vpn_key</span>
                  <div className="flex-1">
                    <p className="text-body-md text-on-surface font-semibold">Crypto Keys</p>
                    <p className="text-10px text-on-surface-variant">4 active keys</p>
                  </div>
                </div>
                <div className="mt-3">
                  <button className="text-10px font-label-caps text-primary hover:underline">MANAGE</button>
                </div>
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

      {showModal === 'setup' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-xl border border-outline-variant w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-label-caps text-label-caps text-on-surface">SET UP 2FA AUTHENTICATION</h3>
              <button onClick={() => setShowModal(null)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
            </div>

            {step === 1 && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-10px font-bold flex items-center justify-center">1</span>
                  <span className="font-label-caps text-10px text-on-surface-variant">SCAN QR CODE</span>
                </div>
                <div className="flex justify-center py-4">
                  <div className="w-48 h-48 bg-surface-container-high border border-outline-variant rounded flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-48px text-on-surface-variant opacity-30">qr_code</span>
                      <p className="text-9px text-on-surface-variant mt-1">QR placeholder</p>
                    </div>
                  </div>
                </div>
                <p className="text-10px text-on-surface-variant text-center">
                  Scan this QR code with your authenticator app, or manually enter the key below.
                </p>
                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded border border-outline-variant">
                  <span className="font-mono text-data-sm text-secondary text-xs">MUSH2-7F3A-2D91-B8C4-USER-{user?.id || '001'}</span>
                  <button className="text-10px font-label-caps text-primary hover:underline">COPY</button>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowModal(null)} className="px-4 py-2 border border-outline text-on-surface-variant font-label-caps text-10px rounded hover:border-primary transition-all">CANCEL</button>
                  <button onClick={() => setStep(2)} className="px-4 py-2 bg-primary text-on-primary font-label-caps text-10px rounded hover:opacity-90 transition-all">NEXT</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-10px font-bold flex items-center justify-center">2</span>
                  <span className="font-label-caps text-10px text-on-surface-variant">VERIFY CODE</span>
                </div>
                <p className="text-body-md text-on-surface-variant">
                  Enter the 6-digit code from your authenticator app to verify setup.
                </p>
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <input
                      key={i}
                      className="w-10 h-12 bg-surface-container-lowest border border-outline-variant rounded text-center text-headline-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      maxLength={1}
                      value={verifyCode[i] || ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '')
                        const newCode = verifyCode.split('')
                        newCode[i] = val
                        setVerifyCode(newCode.join(''))
                        if (val && i < 5) {
                          const next = document.activeElement?.parentElement?.children[i + 1]
                          next?.focus()
                        }
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setStep(1)} className="px-4 py-2 border border-outline text-on-surface-variant font-label-caps text-10px rounded hover:border-primary transition-all">BACK</button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={verifyCode.length < 6}
                    className="px-4 py-2 bg-primary text-on-primary font-label-caps text-10px rounded hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    VERIFY
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-10px font-bold flex items-center justify-center">3</span>
                  <span className="font-label-caps text-10px text-on-surface-variant">BACKUP CODES</span>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded p-4">
                  <p className="text-10px text-primary mb-3">
                    Save these codes in a secure place. Each code can be used once to access your account if you lose your authenticator device.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map(code => (
                      <div key={code} className="font-mono text-data-sm text-secondary bg-surface-container-lowest rounded px-2 py-1 text-center">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={confirmSetup}
                    className="px-4 py-2 bg-primary text-on-primary font-label-caps text-10px rounded hover:opacity-90 transition-all"
                  >
                    DONE — ACTIVATE 2FA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal === 'disable' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-xl border border-outline-variant w-full max-w-sm mx-4 p-5">
            <h3 className="font-label-caps text-label-caps text-on-surface mb-3">DISABLE 2FA</h3>
            <p className="text-body-md text-on-surface-variant mb-5">
              Are you sure? Disabling two-factor authentication will reduce the security level of your account.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(null)} className="px-4 py-2 border border-outline text-on-surface-variant font-label-caps text-10px rounded hover:border-primary transition-all">CANCEL</button>
              <button onClick={confirmDisable} className="px-4 py-2 bg-error text-on-error font-label-caps text-10px rounded hover:opacity-90 transition-all">DISABLE 2FA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserSettings
