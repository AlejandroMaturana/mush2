function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <span className="material-symbols-outlined text-14px">chevron_left</span>
        Anterior
      </button>
      <span className="pagination-info">
        {page} / {totalPages}
      </span>
      <button
        className="pagination-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
        <span className="material-symbols-outlined text-14px">chevron_right</span>
      </button>
    </div>
  )
}

export default Pagination
