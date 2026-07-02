function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="material-symbols-outlined text-64px text-error mb-4">error</span>
      <p className="text-body-md text-error font-semibold">{message || 'CONNECTION_LOST'}</p>
      {onRetry && (
        <button
          className="mt-4 px-6 py-2 bg-error/20 border border-error/40 text-error font-label-caps text-label-caps rounded-md hover:bg-error/30 transition-all"
          onClick={onRetry}
          style={{ cursor: 'pointer' }}
        >
          RETRY_UPLINK
        </button>
      )}
    </div>
  )
}

export default ErrorState
