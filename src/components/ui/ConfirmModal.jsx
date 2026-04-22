import Modal from "./Modal";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  tone = "warning",
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
}) {
  const footer = (
    <>
      <button className="bank-btn bank-btn--ghost" onClick={onClose}>
        Cancel
      </button>
      <button
        className={`bank-btn ${tone === "danger" ? "bank-btn--danger" : "bank-btn--primary"}`}
        onClick={() => {
          onConfirm?.();
          onClose?.();
        }}
      >
        {confirmLabel}
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Please confirm this request before continuing."
      footer={footer}
      size="sm"
    >
      <div className={`bank-confirm bank-confirm--${tone}`}>
        <div className="bank-confirm__icon">
          {tone === "danger" ? "!" : "?"}
        </div>
        <div className="bank-confirm__text">{message}</div>
      </div>
    </Modal>
  );
}