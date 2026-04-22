import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bank-modal-overlay" onClick={onClose}>
      <div
        className={`bank-modal bank-modal--${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bank-modal__header">
          <div>
            <div className="bank-modal__eyebrow">FD WEALTH ENGINE</div>
            <h3 className="bank-modal__title">{title}</h3>
            {subtitle ? <p className="bank-modal__subtitle">{subtitle}</p> : null}
          </div>

          <button className="bank-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="bank-modal__body">{children}</div>

        {footer ? <div className="bank-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}