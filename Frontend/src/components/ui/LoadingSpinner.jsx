export default function LoadingSpinner({ minHeight = '200px' }) {
  return (
    <div className="loading-overlay" style={{ minHeight }}>
      <div className="spinner" />
    </div>
  )
}
