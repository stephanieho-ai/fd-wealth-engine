import Modal from "./Modal";

function formatMoney(value, currency = "MYR") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Row({ label, value }) {
  return (
    <div className="record-detail-row">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

export default function RecordDetailModal({
  open,
  onClose,
  record,
  currency = "MYR",
  onEdit,
  onDelete,
  onCloseFd,
  onRollover,
}) {
  if (!record) return null;

  const isActiveFd = record.sourceType === "FD" && record.status === "ACTIVE";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Record Detail · ${record.id}`}
      subtitle="Review record details and choose the next action."
      size="default"
    >
      <div className="record-detail-card">
        <div className="record-detail-top">
          <div>
            <div className="record-detail-bank">
              {record.bank} · {record.productName}
            </div>
            <div className={`bank-status-pill ${record.status?.toLowerCase?.() || "active"}`}>
              {record.status}
            </div>
          </div>
          <div className="record-detail-amount">
            {formatMoney(record.maturityAmount || record.principal, currency)}
          </div>
        </div>

        <div className="record-detail-grid">
          <Row label="Record Type" value={record.sourceType} />
          <Row label="Start Date" value={record.startDate || "No date"} />
          <Row label="Maturity Date" value={record.maturityDate || "No date"} />
          <Row label="Closed Date" value={record.closedDate || "—"} />
        </div>

        <div className="bank-modal-footer">
          <button
            type="button"
            className="bank-btn bank-btn--ghost"
            onClick={() => onEdit?.(record)}
          >
            Edit
          </button>

          <button
            type="button"
            className="bank-btn bank-btn--ghost danger"
            onClick={() => onDelete?.(record)}
          >
            Delete
          </button>

          {isActiveFd ? (
            <>
              <button
                type="button"
                className="bank-btn bank-btn--ghost"
                onClick={() => onCloseFd?.(record)}
              >
                Close
              </button>

              <button
                type="button"
                className="bank-btn bank-btn--primary"
                onClick={() => onRollover?.(record)}
              >
                Rollover
              </button>
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}