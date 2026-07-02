function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="material-symbols-outlined text-64px text-error mb-4">error</span>
      <p className="text-body-md text-error font-semibold">{message || 'CONNECTION_LOST'}</p>
      {onRetry && (
        <button
          className="btn btn-danger mt-4"
          onClick={onRetry}
        >
          RETRY_UPLINK
        </button>
      )}
    </div>
  )
}

export default ErrorState
