function EventFeed({ events = [], maxItems = 50, onEventClick, emptyMessage = 'Sin eventos registrados' }) {
  const displayEvents = events.slice(0, maxItems)

  if (displayEvents.length === 0) {
    return (
      <div className="event-feed-empty">
        <span className="material-symbols-outlined">inbox</span>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="event-feed">
      {displayEvents.map((event, index) => (
        <div
          key={event.id || index}
          className={`event-feed-item ${event.type || ''}`}
          onClick={() => onEventClick?.(event)}
        >
          <div className="event-feed-icon">
            <span className="material-symbols-outlined">
              {event.icon || 'circle'}
            </span>
          </div>
          <div className="event-feed-content">
            <p className="event-feed-message">{event.message}</p>
            <span className="event-feed-time">{event.time}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default EventFeed
