import React from 'react';

export default function PaginationBar({
  currentPage = 0, // 0-based
  totalPages = 1,
  pageSize = 10,
  totalElements = 0,
  onPageChange = () => {},
  onPageSizeChange = () => {},
  pageSizeOptions = [5, 10, 20, 50, 100],
}) {
  const pageNumbers = [];
  const maxButtons = 7; // up to 7 buttons
  let start = Math.max(0, currentPage - Math.floor(maxButtons / 2));
  let end = Math.min(totalPages - 1, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(0, end - maxButtons + 1);
  }
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  return (
    <div className="pagination-bar">
      <div className="rows-per-page">
        <label htmlFor="rowsPerPage">Rows per page:</label>
        <select
          id="rowsPerPage"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {typeof totalElements === 'number' && totalElements >= 0 && (
          <span className="total-count">{totalElements.toLocaleString()}</span>
        )}
      </div>

      <div className="pager-controls">
        <button
          className="pager-btn"
          onClick={() => onPageChange(0)}
          disabled={currentPage <= 0}
          aria-label="First page"
        >
          «
        </button>
        <button
          className="pager-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 0}
          aria-label="Previous page"
        >
          ‹
        </button>

        {pageNumbers.map((p) => (
          <button
            key={p}
            className={`pager-btn number ${p === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p + 1}
          </button>
        ))}

        <button
          className="pager-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          aria-label="Next page"
        >
          ›
        </button>
        <button
          className="pager-btn"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
          aria-label="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}
