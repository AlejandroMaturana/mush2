function LoadingState({ message = 'Cargando datos...', icon = 'sync' }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <span className="material-symbols-outlined text-48px text-primary opacity-50 mb-4 animate-pulse">{icon}</span>
        <p className="text-body-md text-on-surface-variant">{message}</p>
      </div>
    </div>
  )
}

export default LoadingState
