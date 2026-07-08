import { useState, useEffect } from 'react'
import { getDevices, updateDevice, getLatestTelemetry, getActuators } from '../../api/client.js'
import ToggleSwitch from '../../components/ui/ToggleSwitch.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'

function DeviceSettings() {
  const [devices, setDevices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [device, setDevice] = useState(null)
  const [telemetry, setTelemetry] = useState(null)
  const [actuators, setActuators] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameMsg, setRenameMsg] = useState(null)
  const [firmwareCmd, setFirmwareCmd] = useState('')
  const [firmwareLog, setFirmwareLog] = useState([
    { text: 'System initialized. BIO-OS v2.4.0-STABLE', type: 'ok' },
    { text: 'Repository connected at mush-cloud-alpha.local', type: 'info' },
    { text: 'Found version 2.4.1-beta. Changelog: Optimized mycelium respiration logic.', type: 'info' },
    { text: 'Warning: Update requires 3min system pause. Continue? (y/n)', type: 'warn' },
  ])
  const [sensors] = useState([
    { id: 'TEMP_AMB_01', reading: '24.2°C', offset: '+0.05', drift: '±0.01', status: 'NOMINAL' },
    { id: 'HUMID_REL_01', reading: '82.5%', offset: '-1.20', drift: '±0.05', status: 'NOMINAL' },
    { id: 'CO2_PPM_INT', reading: '840ppm', offset: '+42.0', drift: '±12.0', status: 'DRIFTING' },
    { id: 'VOC_PPB_INT', reading: '152ppb', offset: '+3.2', drift: '±4.1', status: 'NOMINAL' },
  ])

  async function loadData() {
    try {
      const devs = await getDevices()
      setDevices(devs)
      const targetId = selectedId || devs[0]?.id
      if (targetId) {
        setSelectedId(targetId)
        const dev = devs.find(d => d.id === Number(targetId)) || devs[0]
        setDevice(dev)
        setRenameValue(dev.chamberName || dev.deviceId || '')
        const [tel, acts] = await Promise.all([
          getLatestTelemetry(dev.id).catch(() => null),
          getActuators(dev.id).catch(() => []),
        ])
        setTelemetry(tel)
        setActuators(acts)
      }
      setError(null)
    } catch (err) {
      setError(err.message || 'Connection error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function handleRename() {
    if (!device || !renameValue.trim()) return
    setSaving(true)
    setRenameMsg(null)
    try {
      await updateDevice(device.id, { chamberName: renameValue.trim() })
      setDevice(prev => ({ ...prev, chamberName: renameValue.trim() }))
      setRenameMsg({ type: 'ok', text: 'Device name updated successfully' })
    } catch (err) {
      setRenameMsg({ type: 'err', text: err.message || 'Failed to rename device' })
    } finally {
      setSaving(false)
    }
  }

  function handleFirmwareCmd(e) {
    if (e.key === 'Enter' && firmwareCmd.trim()) {
      const cmd = firmwareCmd.toLowerCase()
      let response
      if (cmd === 'y') response = { text: 'Initializing update sequence... Do not disconnect power.', type: 'ok' }
      else if (cmd === 'help') response = { text: 'Available: update, clear, system-check, help', type: 'info' }
      else if (cmd === 'clear') { setFirmwareLog([]); setFirmwareCmd(''); return }
      else response = { text: `Unknown: ${cmd}`, type: 'err' }
      setFirmwareLog(prev => [...prev, { text: `$ ${firmwareCmd}`, type: 'info' }, response])
      setFirmwareCmd('')
    }
  }

  if (loading) return <LoadingState message="Loading device configuration..." icon="developer_board" />
  if (error && devices.length === 0) return <ErrorState message={error} onRetry={loadData} />
  if (devices.length === 0) return <EmptyState icon="developer_board" title="No devices" message="Connect a device to configure hardware settings." />

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-headline-lg text-on-surface mb-1">Device Configuration</h1>
            <p className="text-on-surface-variant text-body-md">Hardware parameters, network identity and critical system core settings.</p>
          </div>
          <select
            className="bg-surface-container border border-outline-variant rounded-md text-body-md text-on-surface px-3 py-1.5 cursor-pointer"
            value={selectedId || ''}
            onChange={e => setSelectedId(Number(e.target.value))}
          >
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.chamberName || d.deviceId}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <section className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary">badge</span>
              <h3 className="font-label-caps text-label-caps text-on-surface-variant">DEVICE IDENTITY</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-label-caps text-9px text-on-surface-variant mb-1">DEVICE ID</p>
                <p className="font-mono text-data-sm text-secondary tracking-widest">{device?.deviceId || 'MUSH-PRIME-001'}</p>
              </div>
              <div>
                <p className="font-label-caps text-9px text-on-surface-variant mb-1">CHAMBER NAME</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-container-lowest border border-outline-variant rounded px-3 py-1.5 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    placeholder="Enter chamber name..."
                  />
                  <button
                    onClick={handleRename}
                    disabled={saving || !renameValue.trim()}
                    className="px-3 py-1.5 bg-primary text-on-primary font-label-caps text-10px rounded hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    {saving ? '...' : 'SAVE'}
                  </button>
                </div>
                {renameMsg && (
                  <p className={`text-10px mt-1 ${renameMsg.type === 'ok' ? 'text-primary' : 'text-error'}`}>
                    {renameMsg.text}
                  </p>
                )}
              </div>
              <div>
                <p className="font-label-caps text-9px text-on-surface-variant mb-1">OPERATIONAL STATUS</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary breathing-pulse" />
                  <span className="font-mono text-data-sm text-primary">
                    {device?.status === 'ONLINE' ? 'ONLINE' : device?.status || 'ACTIVE'}
                  </span>
                </div>
              </div>
              <div>
                <p className="font-label-caps text-9px text-on-surface-variant mb-1">FIRMWARE VERSION</p>
                <p className="font-mono text-data-sm text-on-surface">{device?.firmwareVersion || 'V2.4.0-STABLE'}</p>
              </div>
            </div>
          </section>

          <section className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary">router</span>
              <h3 className="font-label-caps text-label-caps text-on-surface-variant">NETWORK IDENTITY</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">MAC ADDRESS</span>
                <span className="font-mono text-data-sm text-on-surface">{device?.mac || 'E4:5F:01:A2:33:9C'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">IP ADDRESS</span>
                <span className="font-mono text-data-sm text-on-surface">{device?.ip || '192.168.1.144'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">SIGNAL STRENGTH</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-data-sm text-on-surface">{device?.rssi || '-42'} dBm</span>
                  <div className="flex gap-0.5">
                    {[2, 3, 4, 5].map(h => (
                      <div key={h} className="w-1 rounded-sm" style={{ height: `${h*4}px`, background: h < 5 ? 'var(--primary)' : 'var(--outline-variant)' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant">SYSTEM RESOURCE MONITOR</h3>
              <span className="text-10px text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">REALTIME</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between font-data-sm text-data-sm mb-1">
                  <span className="text-on-surface-variant">CPU LOAD</span>
                  <span className="text-primary">{device?.status === 'ONLINE' ? '42.8' : '--'}%</span>
                </div>
                <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded" style={{ width: device?.status === 'ONLINE' ? '42.8%' : '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-data-sm text-data-sm mb-1">
                  <span className="text-on-surface-variant">SRAM UTILIZATION</span>
                  <span className="text-secondary">{device?.status === 'ONLINE' ? '78.2' : '--'} MB / 128 MB</span>
                </div>
                <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded" style={{ width: device?.status === 'ONLINE' ? '61%' : '0%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container rounded border border-outline-variant">
                <div>
                  <div className="font-label-caps text-9px text-on-surface-variant">BIO-LATENCY</div>
                  <div className="text-headline-md text-primary">12ms</div>
                </div>
                <div className="h-10 w-24">
                  <svg className="w-full h-full stroke-primary fill-none" viewBox="0 0 100 40">
                    <path d="M0,35 Q10,10 20,30 T40,25 T60,35 T80,15 T100,20" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded border border-primary/20">
                <span className="material-symbols-outlined text-primary">check_circle</span>
                <div>
                  <p className="text-data-sm text-on-surface">System Integrity</p>
                  <p className="text-10px text-on-surface-variant">Uptime: 142h 22m 10s</p>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary">system_update</span>
              <h3 className="font-label-caps text-label-caps text-on-surface-variant">KERNEL MANAGEMENT</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-container-high rounded">
                <span className="text-data-sm text-on-surface-variant">CURRENT VERSION</span>
                <span className="font-label-caps text-label-caps text-secondary">{device?.firmwareVersion || 'V2.4.0-STABLE'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container-high rounded">
                <span className="text-data-sm text-on-surface-variant">UPLOADER PORT</span>
                <span className="font-label-caps text-label-caps text-on-surface">UART_0_USB</span>
              </div>
              <button className="w-full py-2 bg-primary text-on-primary font-label-caps text-label-caps rounded hover:opacity-90 active:scale-95 transition-all">
                CHECK FOR FIRMWARE UPDATES
              </button>
              <button className="w-full py-2 border border-outline text-on-surface-variant font-label-caps text-label-caps rounded hover:border-primary hover:text-primary transition-all">
                REBOOT KERNEL
              </button>
            </div>
          </section>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-4">
          <section className="glass-card rounded-xl border border-outline-variant overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">precision_manufacturing</span>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant">SENSOR CALIBRATION MATRIX</h3>
              </div>
              <div className="flex gap-2">
                <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">refresh</button>
                <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">save</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-data-sm text-data-sm">
                <thead>
                  <tr className="bg-surface-container-high text-on-surface-variant border-b border-outline-variant">
                    <th className="p-3 font-medium">SENSOR ID</th>
                    <th className="p-3 font-medium">READING</th>
                    <th className="p-3 font-medium">OFFSET</th>
                    <th className="p-3 font-medium">DRIFT L12H</th>
                    <th className="p-3 font-medium">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map(s => (
                    <tr key={s.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors">
                      <td className="p-3 text-on-surface">{s.id}</td>
                      <td className="p-3 font-bold" style={{ color: s.status === 'DRIFTING' ? 'var(--amber)' : 'var(--spore-green)' }}>{s.reading}</td>
                      <td className="p-3">
                        <input
                          className="bg-surface-container-lowest border border-outline-variant w-20 px-2 py-1 rounded text-center text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          defaultValue={s.offset}
                        />
                      </td>
                      <td className="p-3 text-on-surface-variant">{s.drift}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${s.status === 'NOMINAL' ? 'bg-primary breathing-pulse' : 'bg-tertiary'}`} />
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary">settings_power</span>
              <h3 className="font-label-caps text-label-caps text-on-surface-variant">ACTUATOR STATUS</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(actuators.length > 0 ? actuators : [
                { channel: 1, label: 'AIR EXCHANGE', state: true },
                { channel: 2, label: 'MIST SPRAYERS', state: false },
                { channel: 3, label: 'CO2 INJECTION', state: true },
                { channel: 4, label: 'UV-C STERILIZER', state: false },
              ]).map(a => {
                const isOn = a.state === 'ON' || a.state === true
                return (
                  <div key={a.channel} className={`p-3 rounded-lg border text-center transition-all ${isOn ? 'bg-primary/10 border-primary/30' : 'bg-surface-container-low border-outline-variant/30'}`}>
                    <span className={`text-9px font-label-caps ${isOn ? 'text-primary' : 'text-on-surface-variant'}`}>
                      CH{a.channel}
                    </span>
                    <p className={`text-10px mt-1 font-semibold ${isOn ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {a.label || `ACTUATOR ${a.channel}`}
                    </p>
                    <div className={`mt-2 w-2 h-2 rounded-full mx-auto ${isOn ? 'bg-primary breathing-pulse' : 'bg-outline-variant'}`} />
                  </div>
                )
              })}
            </div>
          </section>

          <section className="glass-card rounded-xl border border-outline-variant overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">terminal</span>
                <h3 className="font-label-caps text-label-caps text-on-surface">FIRMWARE TERMINAL v2.4.0</h3>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-error" />
                <div className="w-2 h-2 rounded-full bg-tertiary" />
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
            </div>
            <div className="p-4 font-mono text-data-sm text-primary/80 bg-black/40 min-h-[200px] max-h-[260px] overflow-y-auto" style={{ fontFamily: 'var(--font-mono)' }}>
              {firmwareLog.map((entry, i) => (
                <div key={i} className={`mb-1 ${entry.type === 'err' ? 'text-error' : entry.type === 'warn' ? 'text-tertiary' : entry.type === 'ok' ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {entry.text}
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-secondary">$</span>
                <input
                  className="bg-transparent border-none p-0 focus:ring-0 text-primary w-full outline-none font-mono"
                  type="text"
                  value={firmwareCmd}
                  onChange={e => setFirmwareCmd(e.target.value)}
                  onKeyDown={handleFirmwareCmd}
                  placeholder="Type command..."
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default DeviceSettings
