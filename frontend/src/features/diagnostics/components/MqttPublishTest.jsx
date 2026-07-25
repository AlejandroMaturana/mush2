import { useState } from 'react'

function MqttPublishTest({ onPublish }) {
  const [topic, setTopic] = useState('mush2/test')
  const [payload, setPayload] = useState('{"test": true}')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handlePublish(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await onPublish(topic, JSON.parse(payload))
      setResult({ success: true, message: 'Publicado correctamente' })
    } catch (err) {
      setResult({ success: false, message: err.message || 'Error al publicar' })
    }
    setLoading(false)
  }

  return (
    <div className="glass-card rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-18px">send</span>
        <span className="chart-panel-label">MQTT PUBLISH TEST</span>
      </div>
      <form onSubmit={handlePublish} className="space-y-3">
        <div>
          <label className="font-label-caps text-9px text-on-surface-variant block mb-1">TOPIC</label>
          <input className="input w-full font-mono" value={topic} onChange={e => setTopic(e.target.value)} />
        </div>
        <div>
          <label className="font-label-caps text-9px text-on-surface-variant block mb-1">PAYLOAD (JSON)</label>
          <textarea className="input w-full font-mono text-10px" rows={3} value={payload} onChange={e => setPayload(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
          {loading ? 'Publicando...' : 'Publicar'}
        </button>
      </form>
      {result && (
        <div className={`mt-3 p-2 rounded text-8px font-mono ${result.success ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}>
          {result.message}
        </div>
      )}
    </div>
  )
}

export default MqttPublishTest
