import { useState, useEffect } from 'react'
import { getDevices, getDevice, updateDevice } from '../../api/client.js'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'

function DeviceSettings() {
  const [devices, setDevices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [device, setDevice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameMsg, setRenameMsg] = useState(null)

  async function loadDevices() {
    try {
      const devs = await getDevices()
      setDevices(devs)
      if (!selectedId && devs[0]) {
        setSelectedId(devs[0].id)
      }
      setError(null)
    } catch (err) {
      setError(err.message || 'Connection error')
    } finally {
      setLoading(false)
    }
  }

  async function loadDeviceDetail(id) {
    if (!id) return
    setLoadingDetail(true)
    try {
      const dev = await getDevice(id)
      setDevice(dev)
      setRenameValue(dev.chamberName || dev.deviceId || '')
      setError(null)
    } catch (err) {
      setError(err.message || 'Connection error')
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => { loadDevices() }, [])
  useEffect(() => { loadDeviceDetail(selectedId) }, [selectedId])

  async function handleRename() {
    if (!device || !renameValue.trim()) return
    setSaving(true)
    setRenameMsg(null)
    try {
      await updateDevice(device.id, { chamberName: renameValue.trim() })
      setDevice(prev => ({ ...prev, chamberName: renameValue.trim() }))
      setRenameMsg({ type: 'ok', text: 'Device name updated' })
    } catch (err) {
      setRenameMsg({ type: 'err', text: err.message || 'Failed to rename' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading device configuration..." icon="developer_board" />
  if (error && devices.length === 0) return <ErrorState message={error} onRetry={loadDevices} />
  if (devices.length === 0) return <EmptyState icon="developer_board" title="No devices" message="Connect a device to configure hardware settings." />

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-headline-lg text-on-surface mb-1">Device Configuration</h1>
            <p className="text-on-surface-variant text-body-md">Identity and hardware parameters.</p>
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

      {loadingDetail ? (
        <LoadingState message="Loading device details..." />
      ) : device ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary">badge</span>
              <h3 className="font-label-caps text-label-caps text-on-surface-variant">IDENTITY</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-label-caps text-9px text-on-surface-variant mb-1">DEVICE ID</p>
                <p className="font-mono text-data-sm text-secondary tracking-widest">{device.deviceId || '—'}</p>
              </div>
              <div>
                <p className="font-label-caps text-9px text-on-surface-variant mb-1">CHAMBER NAME</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-container-lowest border border-outline-variant rounded px-3 py-1.5 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    placeholder="Enter name..."
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
                  <p className={`text-10px mt-1 ${renameMsg.type === 'ok' ? 'text-primary' : 'text-error'}`}>{renameMsg.text}</p>
                )}
              </div>
            </div>
          </section>

          <section className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary">settings</span>
              <h3 className="font-label-caps text-label-caps text-on-surface-variant">HARDWARE</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">STATUS</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${device.status === 'ONLINE' ? 'bg-primary breathing-pulse' : 'bg-outline-variant'}`} />
                  <span className="font-mono text-data-sm text-on-surface">{device.status || '—'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">MAC ADDRESS</span>
                <span className="font-mono text-data-sm text-on-surface">{device.macAddress || '—'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">FIRMWARE</span>
                <span className="font-mono text-data-sm text-on-surface">{device.firmwareVersion || '—'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">HW REVISION</span>
                <span className="font-mono text-data-sm text-on-surface">{device.hwRevision || '—'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">CHAMBER ID</span>
                <span className="font-mono text-data-sm text-on-surface">{device.chamberId != null ? device.chamberId : '—'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">LOCATION</span>
                <span className="font-mono text-data-sm text-on-surface">{device.chamberLocation || '—'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">SSR MODE</span>
                <span className="font-mono text-data-sm text-on-surface">{device.ssrActiveLow ? 'Active Low' : 'Active High'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded">
                <span className="font-label-caps text-9px text-on-surface-variant">LAST SEEN</span>
                <span className="font-mono text-data-sm text-on-surface">{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : '—'}</span>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default DeviceSettings
