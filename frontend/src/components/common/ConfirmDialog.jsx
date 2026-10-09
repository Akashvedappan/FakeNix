import Modal from './Modal'

export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  danger = false,
  busy = false,
  onConfirm,
  onCancel
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? undefined : onCancel}
      title={title}
      maxWidth={440}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy && <span className="loader-spinner sm" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{message}</p>
    </Modal>
  )
}
