import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";

const BANK_OPTIONS = ["HLB", "CIMB", "Maybank", "PBB", "RHB", "UOB", "OCBC"];
const TYPE_OPTIONS = ["FD", "Savings", "Parking Cash"];
const STATUS_OPTIONS = ["ACTIVE", "CLOSED"];
const TENURE_OPTIONS = [1, 3, 6, 9, 12, 18, 24, 36];

function addMonths(dateStr, months) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + Number(months || 0));
  if (d.getDate() < originalDay) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

function monthDiff(start, end) {
  if (!start || !end) return 12;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 12;
  const months =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(1, months || 12);
}

function buildInitialForm(initialValues, mode) {
  const sourceType = initialValues?.sourceType || "FD";
  const startDate = initialValues?.startDate || "";
  const maturityDate = initialValues?.maturityDate || "";
  const tenureMonths =
    sourceType === "FD" ? String(monthDiff(startDate, maturityDate)) : "12";

  return {
    bank: initialValues?.bank || "HLB",
    id: initialValues?.id || "",
    sourceType,
    productName: initialValues?.productName || "12M Placement",
    principal:
      initialValues?.principal !== undefined
        ? String(initialValues.principal)
        : "36000",
    status: initialValues?.status || "ACTIVE",
    startDate,
    tenureMonths,
    maturityDate,
    closedDate: initialValues?.closedDate || "",
    mode,
  };
}

export default function AddRecordModal({
  open,
  onClose,
  onSave,
  initialValues = null,
  mode = "add",
}) {
  const [form, setForm] = useState(buildInitialForm(initialValues, mode));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(initialValues, mode));
      setErrors({});
    }
  }, [open, initialValues, mode]);

  useEffect(() => {
    if (!open) return;

    if (form.sourceType === "FD" && form.startDate && form.tenureMonths) {
      const autoMaturity = addMonths(form.startDate, Number(form.tenureMonths));
      if (autoMaturity && (!form.maturityDate || mode === "rollover")) {
        setForm((prev) => ({
          ...prev,
          maturityDate: autoMaturity,
        }));
      }
    }

    if (form.sourceType !== "FD" && form.maturityDate) {
      setForm((prev) => ({
        ...prev,
        maturityDate: "",
      }));
    }
  }, [open, form.sourceType, form.startDate, form.tenureMonths, mode]);

  const titleMap = {
    add: "New Deposit Record",
    edit: "Edit Deposit Record",
    rollover: "Rollover Fixed Deposit",
  };

  const subtitleMap = {
    add: "Create a new fixed deposit, savings reserve or parking cash record.",
    edit: "Update an existing fixed deposit, savings reserve or parking cash record.",
    rollover:
      "Create a new FD placement using the selected fixed deposit as the source.",
  };

  const preview = useMemo(() => {
    const bank = form.bank || "Bank";
    const id =
      mode === "edit"
        ? form.id || "Record ID"
        : mode === "rollover"
        ? "Auto Rollover ID"
        : "Auto ID";
    const type = form.sourceType || "Type";
    return `${bank} · ${id} · ${type}`;
  }, [form, mode]);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
      form: "",
    }));
  }

  function validate() {
    const nextErrors = {};

    if (!form.bank.trim()) nextErrors.bank = "Bank is required.";
    if (!form.sourceType.trim()) nextErrors.sourceType = "Record type is required.";
    if (!form.productName.trim()) nextErrors.productName = "Product name is required.";

    const amount = Number(form.principal);
    if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.principal = "Amount must be greater than 0.";
    }

    if (form.sourceType === "FD") {
      if (!form.startDate) nextErrors.startDate = "Start date is required for FD.";
      if (!form.maturityDate) nextErrors.maturityDate = "Maturity date is required for FD.";

      if (form.startDate && form.maturityDate) {
        const start = new Date(form.startDate);
        const maturity = new Date(form.maturityDate);
        if (maturity < start) {
          nextErrors.maturityDate = "Maturity date cannot be earlier than start date.";
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...(mode === "edit" && form.id ? { id: form.id } : {}),
      bank: form.bank.trim(),
      sourceType: form.sourceType,
      productName: form.productName.trim(),
      principal: Number(form.principal),
      maturityAmount: Number(form.principal),
      status: form.status,
      startDate: form.sourceType === "FD" ? form.startDate : "",
      maturityDate: form.sourceType === "FD" ? form.maturityDate : "",
      closedDate: form.status === "CLOSED" ? form.closedDate || new Date().toISOString().slice(0, 10) : "",
    };

    onSave?.(payload);
    onClose?.();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleMap[mode] || "Deposit Record"}
      subtitle={subtitleMap[mode] || ""}
      size="wide"
    >
      <form className="bank-form" onSubmit={handleSubmit}>
        <div className="bank-form-grid bank-form-grid--two">
          <label className="bank-field">
            <span>Bank</span>
            <select value={form.bank} onChange={(e) => updateField("bank", e.target.value)}>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
            {errors.bank ? <small className="field-error">{errors.bank}</small> : null}
          </label>

          <label className="bank-field">
            <span>Record ID</span>
            <input
              value={
                mode === "edit"
                  ? form.id || ""
                  : mode === "rollover"
                  ? "Auto-generated rollover ID"
                  : "Auto-generated on save"
              }
              disabled
              readOnly
            />
          </label>

          <label className="bank-field">
            <span>Record Type</span>
            <select
              value={form.sourceType}
              onChange={(e) => updateField("sourceType", e.target.value)}
              disabled={mode === "rollover"}
            >
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.sourceType ? (
              <small className="field-error">{errors.sourceType}</small>
            ) : null}
          </label>

          <label className="bank-field">
            <span>Product Name</span>
            <input
              value={form.productName}
              onChange={(e) => updateField("productName", e.target.value)}
              placeholder="12M Placement"
            />
            {errors.productName ? (
              <small className="field-error">{errors.productName}</small>
            ) : null}
          </label>

          <label className="bank-field">
            <span>Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.principal}
              onChange={(e) => updateField("principal", e.target.value)}
              placeholder="36000"
            />
            {errors.principal ? (
              <small className="field-error">{errors.principal}</small>
            ) : null}
          </label>

          <label className="bank-field">
            <span>Status</span>
            <select value={form.status} onChange={(e) => updateField("status", e.target.value)}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="bank-field">
            <span>Start Date</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => updateField("startDate", e.target.value)}
              disabled={form.sourceType !== "FD"}
            />
            {errors.startDate ? (
              <small className="field-error">{errors.startDate}</small>
            ) : null}
          </label>

          <label className="bank-field">
            <span>Tenure (Months)</span>
            <select
              value={form.tenureMonths}
              onChange={(e) => updateField("tenureMonths", e.target.value)}
              disabled={form.sourceType !== "FD"}
            >
              {TENURE_OPTIONS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <label className="bank-field bank-field--full">
            <span>Maturity Date</span>
            <input
              type="date"
              value={form.maturityDate}
              onChange={(e) => updateField("maturityDate", e.target.value)}
              disabled={form.sourceType !== "FD"}
            />
            {errors.maturityDate ? (
              <small className="field-error">{errors.maturityDate}</small>
            ) : null}
          </label>
        </div>

        <div className="bank-preview-box">
          <div className="bank-preview-label">Preview</div>
          <div className="bank-preview-value">{preview}</div>
        </div>

        <div className="bank-modal-footer">
          <button type="button" className="bank-btn bank-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="bank-btn bank-btn--primary">
            {mode === "edit" ? "Save Changes" : mode === "rollover" ? "Create Rollover" : "Save Record"}
          </button>
        </div>
      </form>
    </Modal>
  );
}