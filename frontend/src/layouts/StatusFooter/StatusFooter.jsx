import { useVersionManifest } from '../../shared/hooks/useVersionManifest'

function StatusFooter() {
  const manifest = useVersionManifest()

  return (
    <footer className="status-footer">
      <span className="status-footer-left">
        {manifest ? `Mush2 v${manifest.components.frontend}` : ''}
      </span>
      <span className="status-footer-center">
        {manifest ? `v${manifest.components.backend}` : ''}
      </span>
      <span className="status-footer-right">
        {manifest ? `v${manifest.components.firmware}` : ''}
      </span>
    </footer>
  )
}

export default StatusFooter
