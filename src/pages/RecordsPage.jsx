import { useMemo, useState } from "react";

function formatMoney(value, currency = "MYR") {
  const num = Number(value || 0);
  return `${currency} ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "dd/mm/yyyy";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "dd/mm/yyyy";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function addMonths(dateStr, months) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";

  const originalDate = d.getDate();
  d.setMonth(d.getMonth() + Number(months || 0));

  if (d.getDate() < originalDate) {
    d.setDate(0);
  }

  return d.toISOString().slice(0, 10);
}

function estimateInterest(principal, rate, tenureMonths) {
  const p = Number(principal || 0);
  const r = Number(rate || 0) / 100;
  const t = Number(tenureMonths || 0) / 12;
  return p * r * t;
}

function buildNextId(records = []) {
  const nums = records
    .map((r) => String(r.id || "").match(/^FD(\d+)$/))
    .filter(Boolean)
    .map((m) => Number(m[1]));

  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `FD${String(next).padStart(3, "0")}`;
}

function makeDefaultForm() {
  return {
    bank: "",
    recordType: "FD",
    productName: "",
    amount: 0,
    rate: 0,
    tenure: 0,
    status: "ACTIVE",
    startDate: "",
  };
}

function recordToForm(record) {
  return {
    bank: record.bank || "",
    recordType: record.recordType || "FD",
    productName: record.productName || "",
    amount: Number(record.principal || 0),
    rate: Number(record.rate || 0),
    tenure: Number(record.tenure || 0),
    status: record.status || "ACTIVE",
    startDate: record.startDate || "",
  };
}

export default function RecordsPage({
  currency = "MYR",
  records = [],
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onCloseRecord,
  onRolloverRecord,
}) {
  const [form, setForm] = useState(makeDefaultForm());
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const estimatedInterest = useMemo(() => {
    return estimateInterest(form.amount, form.rate, form.tenure);
  }, [form.amount, form.rate, form.tenure]);

  const maturityDate = useMemo(() => {
    if (!form.startDate || Number(form.tenure || 0) <= 0) return "";
    return addMonths(form.startDate, form.tenure);
  }, [form.startDate, form.tenure]);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const keyword = search.trim().toLowerCase();

      const matchKeyword =
        !keyword ||
        String(item.id || "").toLowerCase().includes(keyword) ||
        String(item.bank || "").toLowerCase().includes(keyword) ||
        String(item.productName || "").toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "ALL" || String(item.status) === statusFilter;

      const matchType =
        typeFilter === "ALL" || String(item.recordType) === typeFilter;

      return matchKeyword && matchStatus && matchType;
    });
  }, [records, search, statusFilter, typeFilter]);

  const resetForm = () => {
    setForm(makeDefaultForm());
    setEditingId("");
  };

  const handleSave = () => {
    const payload = {
      bank: form.bank.trim(),
      recordType: form.recordType,
      productName: form.productName.trim(),
      principal: Number(form.amount || 0),
      rate: Number(form.rate || 0),
      tenure: Number(form.tenure || 0),
      startDate: form.startDate,
      maturityDate,
      estimatedInterest: Number(estimatedInterest || 0),
      status: form.status,
    };

    if (editingId) {
      const updatedRecord = {
        ...payload,
        id: editingId,
      };

      if (typeof onUpdateRecord === "function") {
        onUpdateRecord(updatedRecord);
      }
    } else {
      const newRecord = {
        ...payload,
        id: buildNextId(records),
      };

      if (typeof onAddRecord === "function") {
        onAddRecord(newRecord);
      }
    }

    resetForm();
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setForm(recordToForm(record));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (record) => {
    const ok = window.confirm(`Delete record ${record.id}?`);
    if (!ok) return;

    if (typeof onDeleteRecord === "function") {
      onDeleteRecord(record.id);
    }

    if (editingId === record.id) {
      resetForm();
    }
  };

  const handleClose = (record) => {
    const ok = window.confirm(`Close record ${record.id}?`);
    if (!ok) return;

    if (typeof onCloseRecord === "function") {
      onCloseRecord(record.id);
    }

    if (editingId === record.id) {
      resetForm();
    }
  };

  const handleRollover = (record) => {
    const rolloverAmount = Number(record.principal || 0) + Number(record.estimatedInterest || 0);

    const newRecord = {
      id: buildNextId(records),
      bank: record.bank || "",
      recordType: record.recordType || "FD",
      productName: `${record.productName || "FD"} Rollover`,
      principal: rolloverAmount,
      rate: Number(record.rate || 0),
      tenure: Number(record.tenure || 0),
      startDate: "",
      maturityDate: "",
      estimatedInterest: estimateInterest(
        rolloverAmount,
        Number(record.rate || 0),
        Number(record.tenure || 0)
      ),
      status: "ACTIVE",
    };

    if (typeof onRolloverRecord === "function") {
      onRolloverRecord(newRecord);
    }
  };

  return (
    <div className="page">
      <section className="hero-card">
        <div className="hero-copy">
          <div className="eyebrow-pill">FD WEALTH ENGINE</div>
          <h1>Records</h1>
          <p>
            Manage fixed deposits, savings buckets and parking cash with a
            cleaner record workflow.
          </p>
        </div>

        <div className="hero-metric-card">
          <div className="hero-metric-label">TOTAL RECORDS</div>
          <div className="hero-metric-value">{records.length}</div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 0.95fr",
          gap: 24,
          marginTop: 24,
        }}
      >
        <div className="content-card">
          <div className="card-kicker">
            {editingId ? "EDIT DEPOSIT RECORD" : "ADD DEPOSIT RECORD"}
          </div>
          <h2>{editingId ? "Edit Placement" : "New Placement"}</h2>
          <p className="muted">
            {editingId
              ? "Update the selected record"
              : "Create a new fixed deposit or cash record"}
          </p>

          <div className="settings-form-grid" style={{ marginTop: 20 }}>
            <div className="field">
              <label>Bank</label>
              <input
                className="input"
                placeholder="Example: HLB / DBS / HSBC / UOB"
                value={form.bank}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, bank: e.target.value }))
                }
              />
            </div>

            <div className="field">
              <label>Record Type</label>
              <select
                value={form.recordType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, recordType: e.target.value }))
                }
              >
                <option value="FD">FD</option>
                <option value="SAVINGS">SAVINGS</option>
                <option value="CASH">CASH</option>
              </select>
            </div>

            <div className="field">
              <label>Product Name</label>
              <input
                className="input"
                placeholder="Example: 12M Placement"
                value={form.productName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, productName: e.target.value }))
                }
              />
            </div>

            <div className="field">
              <label>Amount ({currency})</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="field">
              <label>Rate (%)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.rate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    rate: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div className="field">
              <label>Tenure Months</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.tenure}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tenure: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="field">
              <label>Start Date</label>
              <input
                className="input"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>

            <div className="field">
              <label>Maturity Date (Auto)</label>
              <input
                className="input"
                value={formatDateDisplay(maturityDate)}
                readOnly
              />
            </div>

            <div className="field">
              <label>Estimated Interest ({currency})</label>
              <input
                className="input"
                value={formatMoney(estimatedInterest, currency)}
                readOnly
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="btn-primary" onClick={handleSave}>
              {editingId ? "Update Record" : "Save Record"}
            </button>

            {editingId ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </div>

        <div className="content-card">
          <div className="card-kicker">RECORD MANAGEMENT</div>
          <h2>Portfolio Controls</h2>
          <p className="muted">
            Search, edit, close, rollover, delete and export CSV
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 14,
              marginTop: 20,
            }}
          >
            <div
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: 18,
              }}
            >
              <div className="status-title">Quick Notes</div>
              <div className="status-subtitle" style={{ marginTop: 8 }}>
                Edit existing records before maturity, close matured FD when
                completed, or rollover principal + interest into a new FD.
              </div>
            </div>

            <button type="button" className="btn-secondary">
              Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="content-card" style={{ marginTop: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="card-kicker">RECORDS OVERVIEW</div>
            <h2>All Deposit Records</h2>
          </div>

          <div className="text-muted">{filteredRecords.length} record(s)</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.7fr 0.7fr",
            gap: 16,
            marginTop: 20,
          }}
        >
          <input
            className="input"
            placeholder="Search by ID, bank or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="FD">FD</option>
            <option value="SAVINGS">SAVINGS</option>
            <option value="CASH">CASH</option>
          </select>
        </div>

        <div style={{ marginTop: 20 }}>
          {filteredRecords.length === 0 ? (
            <div
              className="empty"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: 28,
                textAlign: "center",
              }}
            >
              No records match your current filter.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {filteredRecords.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div className="status-title">
                        {item.id} · {item.bank || "-"}
                      </div>
                      <div className="status-subtitle">
                        {item.productName || "-"} · {item.recordType || "-"}
                      </div>
                    </div>

                    <div className="status-badge">{item.status || "-"}</div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: 14,
                      marginTop: 16,
                    }}
                  >
                    <div>
                      <div className="text-muted">Amount</div>
                      <div className="status-title" style={{ marginTop: 6 }}>
                        {formatMoney(item.principal, currency)}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted">Rate</div>
                      <div className="status-title" style={{ marginTop: 6 }}>
                        {Number(item.rate || 0).toFixed(2)}%
                      </div>
                    </div>

                    <div>
                      <div className="text-muted">Tenure</div>
                      <div className="status-title" style={{ marginTop: 6 }}>
                        {item.tenure || 0}M
                      </div>
                    </div>

                    <div>
                      <div className="text-muted">Start Date</div>
                      <div className="status-title" style={{ marginTop: 6 }}>
                        {formatDateDisplay(item.startDate)}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted">Maturity Date</div>
                      <div className="status-title" style={{ marginTop: 6 }}>
                        {formatDateDisplay(item.maturityDate)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        padding: 14,
                      }}
                    >
                      <div className="text-muted">Estimated Interest</div>
                      <div className="status-title" style={{ marginTop: 6 }}>
                        {formatMoney(item.estimatedInterest, currency)}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        padding: 14,
                      }}
                    >
                      <div className="text-muted">Workflow</div>
                      <div className="status-subtitle" style={{ marginTop: 6 }}>
                        Edit / Delete / Close / Rollover available
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 16,
                    }}
                  >
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleClose(item)}
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleRollover(item)}
                    >
                      Rollover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}