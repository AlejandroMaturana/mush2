import { formatTimeAgo } from '../utils/format'

// ── Presentación por primaryStatus (M0.2 §4 / tokens de design-system) ─
// Esto es SOLO presentación (color/icono). NO implementa precedencia:
// la precedencia vive en backend (cameraStatusSemantics.js, D2 T2/T3).
const PRIMARY_STATUS_CONFIG = {
  OPERATIVA: { color: 'var(--spore-green)', icon: 'check_circle', tone: 'online' },
  'SIN CONEXIÓN': { color: 'var(--error-red)', icon: 'wifi_off', tone: 'offline' },
  'EN MANTENIMIENTO': { color: 'var(--info)', icon: 'build', tone: 'info' },
  AVISO: { color: 'var(--amber)', icon: 'warning', tone: 'warning' },
  PROVISIONANDO: { color: 'var(--outline)', icon: 'bluetooth', tone: 'offline' },
  RETIRADA: { color: 'var(--outline)', icon: 'power_off', tone: 'offline' },
  DATOS_NO_DISPONIBLES: { color: 'var(--outline)', icon: 'help', tone: 'offline' },
}

const AXIS_LABELS = {
  lifecycle: 'Ciclo de vida',
  connectivity: 'Conectividad',
  health: 'Salud',
}

/**
 * CameraStatus — representación única y consistente del estado de una cámara
 * (M0.2 §10). Consume los campos semánticos derivados por el backend
 * (primaryStatus/primaryLabel/primaryReason/secondaryStates/lastTransmission/
 * technicalDetails) y aplica SOLO presentación + Progressive Disclosure.
 *
 * NO reimplementa la precedencia: recibe primaryStatus ya resuelto.
 */
function CameraStatus({
  primaryStatus,
  primaryLabel,
  primaryReason,
  secondaryStates,
  lastTransmission,
  technicalDetails,
}) {
  const cfg = PRIMARY_STATUS_CONFIG[primaryStatus] || PRIMARY_STATUS_CONFIG.DATOS_NO_DISPONIBLES
  const label = primaryLabel || primaryStatus || 'Datos no disponibles'
  const displayName = primaryStatus === 'DATOS_NO_DISPONIBLES' || !primaryStatus ? 'Datos no disponibles' : label

  const transmissionSeconds = lastTransmission?.secondsSinceLastSeen ?? null

  return (
    <div className="camera-status" style={{ display: 'grid', gap: '10px' }}>
      {/* Nivel primario */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span
          className={`camera-status-dot ${cfg.tone}`}
          style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color }}
          aria-hidden="true"
        />
        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: cfg.color }} aria-hidden="true">
          {cfg.icon}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>{displayName}</span>
        {primaryReason && (
          <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>· {primaryReason}</span>
        )}
      </div>

      {/* Nivel secundario: desglose por ejes + última transmisión */}
      {(secondaryStates || lastTransmission) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {secondaryStates && Object.entries(secondaryStates).map(([axis, value]) => {
            if (!value) return null
            return (
              <span
                key={axis}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '3px 8px', borderRadius: '6px',
                  background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)',
                  fontFamily: 'var(--font-mono)', fontSize: '9px',
                }}
              >
                <span style={{ color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {AXIS_LABELS[axis] || axis}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--on-surface)' }}>{value.label || value.value}</span>
              </span>
            )
          })}
          {typeof transmissionSeconds === 'number' ? (
            <span className="camera-status-transmission" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--on-surface-variant)' }}>
              Última transmisión: <span className="camera-status-transmission-value">{formatTimeAgo(transmissionSeconds)}</span>
            </span>
          ) : (
            <span className="camera-status-transmission" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--on-surface-variant)' }}>
              Última transmisión: <span className="camera-status-transmission-value">Sin datos</span>
            </span>
          )}
        </div>
      )}

      {/* Nivel experto (M0.2 §10): technicalDetails bajo Progressive Disclosure (H-4).
          Solo se muestra si el backend lo provee; NO se elimina información, solo
          queda oculta tras un desplegable. */}
      {technicalDetails && Object.keys(technicalDetails).length > 0 && (
        <details className="camera-status-expert">
          <summary style={{ fontSize: '11px', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
            Vista experta · diagnóstico
            <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }} aria-hidden="true">expand_more</span>
          </summary>
          <div style={{ display: 'grid', gap: '6px', marginTop: '6px', fontSize: '11px' }}>
            {Object.entries(technicalDetails).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', gap: '8px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--outline)', width: '120px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>{key}</span>
                {value != null ? (
                  <span style={{ color: 'var(--on-surface)' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                ) : (
                  <span style={{ color: 'var(--on-surface-variant)' }}>Sin datos</span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export default CameraStatus

export { PRIMARY_STATUS_CONFIG, AXIS_LABELS }
