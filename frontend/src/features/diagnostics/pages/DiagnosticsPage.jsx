import { useState, useEffect } from 'react'
import { getMqttDiagnostics, publishMqttTest } from '../../../api/client.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'
import Panel from '../../../shared/components/Panel.jsx'
import StatusCard from '../../../shared/components/StatusCard.jsx'
import DashboardGrid from '../../../shared/components/DashboardGrid.jsx'

const BROKER_FIELDS = [
  { key: 'primary', label: 'PRIMARY', statusKey: 'primaryConnected' },
  { key: 'fallback', label: 'FALLBACK', statusKey: 'fallbackConnected' },
]

function Diagnostics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [pubMsg, setPubMsg] = useState(null)
  const [selectedDevice, setSelectedDevice] = useState('')

  async function fetchDiag() {
    try {
      const d = await getMqttDiagnostics()
      setData(d)
      if (d.ssrChannels?.length > 0 && !selectedDevice) {
        setSelectedDevice(d.ssrChannels[0].deviceId)
      }
      setError(null)
    } catch (err) {
      setError(err.message || 'Error al cargar diagnósticos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDiag() }, [])

  async function handlePublish() {
    if (!selectedDevice) return
    setPublishing(true)
    setPubMsg(null)
    try {
      const result = await publishMqttTest(selectedDevice)
      setPubMsg({ type: result.data.published ? 'ok' : 'warn', text: result.message })
    } catch (err) {
      setPubMsg({ type: 'err', text: err.response?.data?.error || err.message })
    } finally {
      setPublishing(false)
    }
  }

  if (loading) return <LoadingState message="Cargando diagnósticos..." icon="diagnosis" />

  const { mqtt, ssrChannels, chamberControlMode } = data || {}
  const uniqueDevices = ssrChannels?.length > 0
    ? [...new Set(ssrChannels.map(ch => ch.deviceId))]
    : chamberControlMode ? Object.keys(chamberControlMode) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <EntityHeader
        title="Diagnósticos"
        subtitle="Estado de conexión MQTT y diagnósticos del sistema"
      />

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <DashboardGrid columns={2}>
        <Panel title="Estado del broker MQTT" subtitle="Estado de conexión">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {BROKER_FIELDS.map(({ key, label, statusKey }) => {
              const connected = mqtt?.[statusKey]
              return (
                <StatusCard
                  key={key}
                  status={connected ? 'online' : 'offline'}
                  title={label}
                  subtitle={connected ? 'Conectado' : (connected === false ? 'Desconectado' : 'No configurado')}
                />
              )
            })}
            <StatusCard
              status="online"
              title="Dispositivos conectados"
              metric={mqtt?.connectedDevices ?? '—'}
            />
          </div>
        </Panel>

        <Panel title="Modo de control de cámara" subtitle="Control por dispositivo">
          {chamberControlMode && Object.keys(chamberControlMode).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(chamberControlMode).map(([deviceId, mode]) => (
                <StatusCard
                  key={deviceId}
                  status={mode === 'AUTO' ? 'online' : 'offline'}
                  title={deviceId}
                  subtitle={`Modo: ${mode}`}
                />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--outline)', textAlign: 'center', padding: '32px 0' }}>Sin dispositivos registrados</p>
          )}
        </Panel>
      </DashboardGrid>

      <Panel title="Canales SSR" subtitle="Estados de relé activos">
        {ssrChannels && ssrChannels.length > 0 ? (
          <div style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Canal</th>
                  <th>Estado</th>
                  <th>Modo</th>
                </tr>
              </thead>
              <tbody>
                {ssrChannels.map((ch, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--on-surface)' }}>{ch.deviceId}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--on-surface)' }}>{ch.channel}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: (ch.state === 'ON' || ch.state === 1) ? 'var(--spore-green)' : 'var(--outline)',
                        }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: (ch.state === 'ON' || ch.state === 1) ? 'var(--spore-green)' : 'var(--on-surface-variant)' }}>
                          {ch.state ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{ch.mode || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--outline)', textAlign: 'center', padding: '24px 0' }}>Sin canales SSR</p>
        )}
      </Panel>

      <Panel title="Prueba de publicación MQTT" subtitle="Enviar payload de prueba al dispositivo">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Dispositivo</label>
            <select className="form-select" style={{ fontSize: '11px' }} value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
              {uniqueDevices.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-glow"
            style={{ fontSize: '10px', whiteSpace: 'nowrap' }}
            onClick={handlePublish}
            disabled={publishing || !selectedDevice}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>send</span>
            {publishing ? 'PUBLICANDO...' : 'PUBLICAR PRUEBA'}
          </button>
        </div>
        {pubMsg && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
            background: pubMsg.type === 'ok' ? 'rgba(var(--spore-green-rgb), 0.08)' : pubMsg.type === 'warn' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${pubMsg.type === 'ok' ? 'rgba(var(--spore-green-rgb), 0.2)' : pubMsg.type === 'warn' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          }}>
            <span style={{
              fontSize: '12px', fontWeight: 600,
              color: pubMsg.type === 'ok' ? 'var(--spore-green)' : pubMsg.type === 'warn' ? 'var(--amber)' : 'var(--error-red)',
            }}>
              {pubMsg.text}
            </span>
          </div>
        )}
      </Panel>
    </div>
  )
}

export default Diagnostics
