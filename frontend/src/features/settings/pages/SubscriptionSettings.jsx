import { useState, useEffect } from 'react'
import { getSubscription, getSubscriptionUsage, upgradePlan, cancelSubscription } from '../../../api/client.js'

const PLAN_STYLES = {
  FREE: { bg: 'rgba(153, 153, 153, 0.1)', color: 'var(--outline)', border: 'rgba(153, 153, 153, 0.3)' },
  BASIC: { bg: 'rgba(var(--spore-green-rgb), 0.15)', color: 'var(--spore-green)', border: 'rgba(var(--spore-green-rgb), 0.3)' },
  PREMIUM: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber)', border: 'rgba(245, 158, 11, 0.3)' },
}

function UpgradeModal({ currentPlan, onClose, onUpgrade }) {
  const plans = [
    { id: 'FREE', name: 'Free', calls: '50,000 / mes', retention: '30 días', price: 'Gratis', features: ['Hasta 50,000 llamadas API/mes', 'Retención de 30 días', '1 dispositivo'] },
    { id: 'BASIC', name: 'Basic', calls: '10,000 / mes', retention: '90 días', price: 'Próximamente', features: ['Hasta 10,000 llamadas API/mes', 'Retención de 90 días', 'Múltiples dispositivos', 'Soporte prioritario'] },
    { id: 'PREMIUM', name: 'Premium', calls: '100,000 / mes', retention: '365 días', price: 'Próximamente', features: ['Hasta 100,000 llamadas API/mes', 'Retención de 365 días', 'Dispositivos ilimitados', 'Soporte 24/7', 'API dedicada'] },
  ]
  // NOTE: These plans mirror the backend Subscription model tiers.
  // When the backend exposes a /plans endpoint, replace this with an API call.

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)' }}>Mejorar plan</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span></button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {plans.map(p => {
              const isCurrent = p.id === currentPlan
              const isDown = (currentPlan === 'BASIC' && p.id === 'FREE') || (currentPlan === 'PREMIUM' && p.id !== 'PREMIUM')
              const ps = PLAN_STYLES[p.id]
              return (
                <div key={p.id} className="glass-card" style={{
                  padding: '16px', opacity: isDown ? 0.5 : 1, transition: 'all 0.2s',
                  borderColor: isCurrent ? ps.color : undefined,
                }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', background: ps.bg, color: ps.color, border: `1px solid ${ps.border}`, display: 'inline-block', marginBottom: '8px' }}>{p.name}</span>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '12px' }}>{p.price}</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {p.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--spore-green)', flexShrink: 0, marginTop: '1px' }}>check</span>{f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent && <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--spore-green)', textAlign: 'center', marginTop: '12px' }}>Plan actual</p>}
                  {!isCurrent && !isDown && (
                    <button onClick={() => onUpgrade(p.id)} className="btn btn-glow" style={{ width: '100%', fontSize: '10px', marginTop: '12px' }}>Seleccionar</button>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '10px' }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CancelModal({ onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Cancelar suscripción</h2>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginBottom: '20px' }}>¿Estás seguro? Tu plan se cancelará y los datos se retendrán según el período actual.</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '10px' }}>Volver</button>
            <button onClick={onConfirm} className="btn btn-danger" style={{ fontSize: '10px' }}>Cancelar suscripción</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubscriptionSettings() {
  const [sub, setSub] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    Promise.all([getSubscription(), getSubscriptionUsage()])
      .then(([subData, usageData]) => { setSub(subData.data); setUsage(usageData.data) })
      .catch(() => setMessage({ type: 'error', text: 'Error al cargar datos de suscripción' }))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(plan) {
    try { const { data } = await upgradePlan(plan); setSub(data); setShowUpgrade(false); setMessage({ type: 'success', text: `Plan actualizado a ${plan}` }) }
    catch (err) { setMessage({ type: 'error', text: err.response?.data?.error || 'Error' }) }
  }

  async function handleCancel() {
    try { await cancelSubscription(); setSub(p => ({ ...p, status: 'CANCELED', canceledAt: new Date().toISOString() })); setShowCancel(false); setMessage({ type: 'success', text: 'Suscripción cancelada' }) }
    catch (err) { setMessage({ type: 'error', text: err.response?.data?.error || 'Error' }) }
  }

  if (loading) return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ height: '32px', width: '180px', background: 'var(--surface-container-high)', borderRadius: '8px', marginBottom: '16px' }} />
      <div style={{ height: '160px', background: 'var(--surface-container-high)', borderRadius: '12px' }} />
    </div>
  )

  const ps = PLAN_STYLES[sub?.plan] || PLAN_STYLES.FREE
  const pct = usage?.percentage || 0
  const barColor = pct >= 90 ? 'var(--error-red)' : pct >= 70 ? 'var(--amber)' : 'var(--spore-green)'

  return (
    <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="gradient-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Suscripción</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--outline)' }}>Gestiona tu plan y consumo de API</p>
      </div>

      {message && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: message.type === 'success' ? 'rgba(var(--spore-green-rgb), 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${message.type === 'success' ? 'rgba(var(--spore-green-rgb), 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: message.type === 'success' ? 'var(--spore-green)' : 'var(--error-red)' }}>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', fontSize: '16px' }}>✕</button>
        </div>
      )}

      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>{sub?.plan}</span>
          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: sub?.status === 'ACTIVE' ? 'rgba(var(--spore-green-rgb), 0.15)' : 'rgba(239, 68, 68, 0.15)', color: sub?.status === 'ACTIVE' ? 'var(--spore-green)' : 'var(--error-red)' }}>{sub?.status}</span>
          <span style={{ fontSize: '11px', color: 'var(--outline)' }}>{sub?.dataRetentionDays} días de retención</span>
        </div>

        {usage && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '6px' }}>
              <span>{usage.apiCallsUsedThisMonth.toLocaleString()} / {usage.apiCallsPerMonth.toLocaleString()} llamadas</span>
              <span style={{ fontWeight: 600, color: barColor }}>{pct}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(var(--surface-dim-rgb, 28, 27, 31), 0.6)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--outline-variant)' }}>
              <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: '9999px', background: barColor, transition: 'width 0.5s' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', marginTop: '6px' }}>
              Período: {new Date(usage.currentPeriodStart).toLocaleDateString()} — {new Date(usage.currentPeriodEnd).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {sub?.status === 'ACTIVE' && sub?.plan !== 'PREMIUM' && (
        <button onClick={() => setShowUpgrade(true)} className="btn btn-glow" style={{ width: '100%', fontSize: '12px', padding: '12px' }}>Mejorar plan</button>
      )}
      {sub?.status === 'ACTIVE' && (
        <button onClick={() => setShowCancel(true)} className="btn btn-secondary" style={{ width: '100%', fontSize: '12px', padding: '12px' }}>Cancelar suscripción</button>
      )}

      {showUpgrade && <UpgradeModal currentPlan={sub?.plan} onClose={() => setShowUpgrade(false)} onUpgrade={handleUpgrade} />}
      {showCancel && <CancelModal onClose={() => setShowCancel(false)} onConfirm={handleCancel} />}
    </div>
  )
}

export default SubscriptionSettings
