import { useEffect, useRef } from 'react'

/**
 * A simple accessible confirmation dialog.
 */
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', confirmClass = 'btn-danger-custom' }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{ background: 'rgba(0,0,0,0.4)' }}
    >
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="confirm-dialog-title">{title}</h5>
          </div>
          <div className="modal-body">
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
              {message}
            </p>
          </div>
          <div className="modal-footer gap-2">
            <button ref={cancelRef} className="btn-secondary-custom" onClick={onCancel}>
              Cancel
            </button>
            <button className={confirmClass} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
