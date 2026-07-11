import { useState, useEffect } from 'react'
import { getSubscription, getSubscriptionUsage, upgradePlan, cancelSubscription } from '../../api/client.js'

const PLAN_COLORS = { FREE: 'bg-neutral-600', BASIC: 'bg-primary', PREMIUM: 'bg-amber-500' }
const PLAN_BG = { FREE: 'bg-neutral-100 text-neutral-800', BASIC: 'bg-primary-container text-on-primary-container', PREMIUM: 'bg-amber-100 text-amber-800' }
const PLAN_STYLES = { FREE: 'neutral', BASIC: 'primary', PREMIUM: 'amber' }

function UsageBar({ used, limit, percentage }) {
  const color = percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-primary'
  return (
    <div className="mt-4">
      <div className="flex justify-between text-body-sm text-on-surface-variant mb-1">
        <span>{used.toLocaleString()} / {limit.toLocaleString()} calls</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  )
}

function UpgradeModal({ currentPlan, onClose, onUpgrade }) {
  const plans = [
    { id: 'FREE', name: 'Free', calls: '1,000 / mes', retention: '30 días', price: 'Gratis', features: ['Hasta 1,000 llamadas API/mes', 'Retención de 30 días', '1 dispositivo'] },
    { id: 'BASIC', name: 'Basic', calls: '10,000 / mes', retention: '90 días', price: 'Próximamente', features: ['Hasta 10,000 llamadas API/mes', 'Retención de 90 días', 'Múltiples dispositivos', 'Soporte prioritario'] },
    { id: 'PREMIUM', name: 'Premium', calls: '100,000 / mes', retention: '365 días', price: 'Próximamente', features: ['Hasta 100,000 llamadas API/mes', 'Retención de 365 días', 'Dispositivos ilimitados', 'Soporte 24/7', 'API dedicada'] },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl border border-outline-variant p-6 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-headline-md text-on-surface mb-6">Mejorar plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {plans.map(p => {
            const isCurrent = p.id === currentPlan
            const isDown = (currentPlan === 'BASIC' && p.id === 'FREE') || (currentPlan === 'PREMIUM' && p.id !== 'PREMIUM')
            return (
              <div key={p.id} className={`rounded-xl border p-4 ${isCurrent ? 'border-primary bg-primary-container/30' : 'border-outline-variant bg-surface-container-lowest'} ${isDown ? 'opacity-50' : ''}`}>
                <div className={`inline-block px-2.5 py-0.5 rounded-full text-label-sm mb-2 ${PLAN_BG[p.id]}`}>{p.name}</div>
                <p className="text-headline-lg text-on-surface mb-1">{p.price}</p>
                <ul className="text-body-sm text-on-surface-variant space-y-1 mt-3">
                  {p.features.map((f, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-primary mt-0.5">✓</span>{f}</li>)}
                </ul>
                {isCurrent && <p className="text-label-sm text-primary mt-3 text-center">Plan actual</p>}
                {!isCurrent && !isDown && (
                  <button onClick={() => onUpgrade(p.id)} className="w-full mt-3 py-2 px-4 rounded-lg bg-primary text-on-primary text-label-sm hover:bg-primary-hover transition-colors">
                    {p.id === 'PREMIUM' ? 'Seleccionar' : 'Seleccionar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="py-2 px-4 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function CancelModal({ onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl border border-outline-variant p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-headline-md text-on-surface mb-2">Cancelar suscripción</h2>
        <p className="text-body-md text-on-surface-variant mb-6">¿Estás seguro? Tu plan se cancelará y los datos se retendrán según el período actual.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="py-2 px-4 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">Volver</button>
          <button onClick={onConfirm} className="py-2 px-4 rounded-lg bg-red-600 text-white text-label-sm hover:bg-red-700 transition-colors">Cancelar suscripción</button>
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
      .then(([subData, usageData]) => {
        setSub(subData.data)
        setUsage(usageData.data)
      })
      .catch(() => setMessage({ type: 'error', text: 'Error al cargar datos de suscripción' }))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(plan) {
    try {
      const { data } = await upgradePlan(plan)
      setSub(data)
      setUsage(prev => ({ ...prev, plan: data.plan, ...SubscriptionSettings.getPlanLimits(data.plan) }))
      setShowUpgrade(false)
      setMessage({ type: 'success', text: `Plan actualizado a ${plan}` })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al actualizar plan' })
    }
  }

  async function handleCancel() {
    try {
      await cancelSubscription()
      setSub(prev => ({ ...prev, status: 'CANCELED', canceledAt: new Date().toISOString() }))
      setShowCancel(false)
      setMessage({ type: 'success', text: 'Suscripción cancelada' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al cancelar' })
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-container-high rounded" />
          <div className="h-40 bg-surface-container-high rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-headline-lg text-on-surface mb-1">Suscripción</h2>
        <p className="text-body-md text-on-surface-variant">Gestiona tu plan y consume de API</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-body-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button className="float-right text-current opacity-60 hover:opacity-100" onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      <div className="glass-card rounded-xl border border-outline-variant p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`inline-block px-3 py-0.5 rounded-full text-label-sm font-semibold ${PLAN_BG[sub?.plan]}`}>{sub?.plan}</span>
              <span className={`inline-block px-2 py-0.5 rounded text-label-xs ${sub?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sub?.status}</span>
            </div>
            <p className="text-body-sm text-on-surface-variant mt-1">{sub?.dataRetentionDays} días de retención de datos</p>
          </div>
        </div>

        {usage && <UsageBar used={usage.apiCallsUsedThisMonth} limit={usage.apiCallsPerMonth} percentage={usage.percentage} />}

        {usage && (
          <p className="text-body-xs text-on-surface-variant mt-2">
            Período actual: {new Date(usage.currentPeriodStart).toLocaleDateString()} — {new Date(usage.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}
      </div>

      {sub?.status === 'ACTIVE' && sub?.plan !== 'PREMIUM' && (
        <button onClick={() => setShowUpgrade(true)} className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:bg-primary-hover transition-colors mb-3">
          Mejorar plan
        </button>
      )}

      {sub?.status === 'ACTIVE' && (
        <button onClick={() => setShowCancel(true)} className="w-full py-3 px-4 rounded-xl border border-outline-variant text-on-surface-variant text-label-md hover:bg-surface-container-high hover:text-on-surface transition-colors">
          Cancelar suscripción
        </button>
      )}

      {showUpgrade && <UpgradeModal currentPlan={sub?.plan} onClose={() => setShowUpgrade(false)} onUpgrade={handleUpgrade} />}
      {showCancel && <CancelModal onClose={() => setShowCancel(false)} onConfirm={handleCancel} />}
    </div>
  )
}

export default SubscriptionSettings
