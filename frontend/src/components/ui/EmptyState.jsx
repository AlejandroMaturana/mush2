function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <span className="material-symbols-outlined text-64px text-on-surface-variant opacity-30 mb-4">{icon}</span>}
      {title && <h3 className="text-headline-md text-on-surface mb-2">{title}</h3>}
      {message && <p className="text-body-md text-on-surface-variant max-w-md">{message}</p>}
      {action && (
        <button
          className="mt-4 px-6 py-2 bg-primary text-on-primary font-label-caps text-label-caps rounded-md hover:brightness-110 transition-all"
          onClick={action.onClick}
          style={{ border: 'none', cursor: 'pointer' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
