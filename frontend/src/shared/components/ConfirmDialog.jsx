import Modal from './Modal'

function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'Confirmar acción', message, confirmLabel = 'Confirmar', loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="400px">
      <div className="confirm-dialog">
        <p>{message}</p>
        <div className="flex gap-3 justify-center">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
