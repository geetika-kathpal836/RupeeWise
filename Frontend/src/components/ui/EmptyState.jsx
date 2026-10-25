export default function EmptyState({ icon = 'bi-inbox', title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <i className={`bi ${icon}`} style={{ fontSize: '1.75rem' }} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  )
}
