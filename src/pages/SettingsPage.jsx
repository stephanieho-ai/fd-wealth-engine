import { useEffect, useMemo, useState } from "react";

const CURRENCY_OPTIONS = [
  "MYR",
  "USD",
  "SGD",
  "EUR",
  "GBP",
  "AUD",
  "NZD",
  "CAD",
  "CHF",
  "JPY",
  "CNY",
  "HKD",
  "THB",
  "IDR",
  "PHP",
  "INR",
  "KRW",
  "AED",
  "SAR",
  "SEK",
  "NOK",
  "DKK",
  "ZAR",
  "MXN",
  "BRL",
];

const DEFAULT_SETTINGS = {
  currency: "MYR",
  notifications: true,
  darkMode: false,
  autoBackup: true,
  compactMode: false,
};

function buildMergedSettings(settings, currency) {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    currency: settings?.currency || currency || "MYR",
  };
}

export default function SettingsPage({
  settings = {},
  onUpdateSettings,
  currency = "MYR",
}) {
  const mergedSettings = useMemo(
    () => buildMergedSettings(settings, currency),
    [settings, currency]
  );

  const [form, setForm] = useState(mergedSettings);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setForm(mergedSettings);
  }, [mergedSettings]);

  function patchForm(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaveMessage("");
  }

  function handleSave() {
    onUpdateSettings?.(form);
    setSaveMessage("Settings saved successfully.");
  }

  function handleReset() {
    const resetSettings = buildMergedSettings({}, "MYR");
    setForm(resetSettings);
    onUpdateSettings?.(resetSettings);
    setSaveMessage("Settings reset to default.");
  }

  return (
    <div className="page">
      <section className="hero-card bank-hero compact">
        <div className="hero-left">
          <div className="hero-badge">FD WEALTH ENGINE</div>
          <h1 className="bank-title">Settings</h1>
          <p className="bank-subtitle">
            Manage workspace preferences, currency, alerts and system behavior.
          </p>
        </div>

        <div className="hero-right">
          <div className="metric-card bank-main-metric">
            <span>WORKSPACE</span>
            <strong>{form.currency}</strong>
          </div>
        </div>
      </section>

      <div className="records-top-grid">
        <section className="bank-panel">
          <div className="panel-kicker">PREFERENCES</div>
          <h3>Workspace Settings</h3>
          <p>Set your base currency and portfolio working preferences.</p>

          <div className="record-form-grid" style={{ marginTop: 18 }}>
            <div className="field">
              <label>Base Currency</label>
              <select
                value={form.currency}
                onChange={(e) => patchForm("currency", e.target.value)}
              >
                {CURRENCY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Notification Alerts</label>
              <button
                type="button"
                className={`settings-toggle ${form.notifications ? "on" : ""}`}
                onClick={() => patchForm("notifications", !form.notifications)}
              >
                <span>{form.notifications ? "ON" : "OFF"}</span>
              </button>
            </div>

            <div className="field">
              <label>Dark Mode</label>
              <button
                type="button"
                className={`settings-toggle ${form.darkMode ? "on" : ""}`}
                onClick={() => patchForm("darkMode", !form.darkMode)}
              >
                <span>{form.darkMode ? "ON" : "OFF"}</span>
              </button>
            </div>

            <div className="field">
              <label>Auto Backup</label>
              <button
                type="button"
                className={`settings-toggle ${form.autoBackup ? "on" : ""}`}
                onClick={() => patchForm("autoBackup", !form.autoBackup)}
              >
                <span>{form.autoBackup ? "ON" : "OFF"}</span>
              </button>
            </div>

            <div className="field">
              <label>Compact Mode</label>
              <button
                type="button"
                className={`settings-toggle ${form.compactMode ? "on" : ""}`}
                onClick={() => patchForm("compactMode", !form.compactMode)}
              >
                <span>{form.compactMode ? "ON" : "OFF"}</span>
              </button>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 18 }}>
            <button type="button" className="primary-btn" onClick={handleSave}>
              Save Settings
            </button>
            <button type="button" className="secondary-btn" onClick={handleReset}>
              Reset Default
            </button>
          </div>

          {saveMessage && (
            <div className="settings-save-banner" style={{ marginTop: 14 }}>
              {saveMessage}
            </div>
          )}
        </section>

        <section className="bank-panel">
          <div className="panel-kicker">SYSTEM STATUS</div>
          <h3>Environment Summary</h3>
          <p>Quick view of your current workspace configuration.</p>

          <div className="module-stack" style={{ marginTop: 18 }}>
            <div className="record-card">
              <div className="record-card-head">
                <div>
                  <h4>Base Currency</h4>
                  <p>Default portfolio denomination</p>
                </div>
                <span className="status-badge active">{form.currency}</span>
              </div>
            </div>

            <div className="record-card">
              <div className="record-card-head">
                <div>
                  <h4>Notifications</h4>
                  <p>Maturity and action alerts</p>
                </div>
                <span className={`status-badge ${form.notifications ? "active" : "closed"}`}>
                  {form.notifications ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="record-card">
              <div className="record-card-head">
                <div>
                  <h4>Backup State</h4>
                  <p>Local workspace backup preference</p>
                </div>
                <span className={`status-badge ${form.autoBackup ? "active" : "closed"}`}>
                  {form.autoBackup ? "Active" : "Off"}
                </span>
              </div>
            </div>

            <div className="record-card">
              <div className="record-card-head">
                <div>
                  <h4>Theme Mode</h4>
                  <p>Visual workspace mode</p>
                </div>
                <span className={`status-badge ${form.darkMode ? "closed" : "active"}`}>
                  {form.darkMode ? "Dark" : "Light"}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="bank-panel">
        <div className="bank-panel-head">
          <div>
            <div className="panel-kicker">SETTINGS GUIDE</div>
            <h3>Workspace Notes</h3>
          </div>
          <small>Operational guidance</small>
        </div>

        <div className="records-grid">
          <div className="record-card">
            <div className="record-card-head">
              <div>
                <h4>Currency</h4>
                <p>Changing this updates the default workspace display currency.</p>
              </div>
              <span className="status-badge active">Live</span>
            </div>
          </div>

          <div className="record-card">
            <div className="record-card-head">
              <div>
                <h4>Notifications</h4>
                <p>Use this to control maturity and execution reminders.</p>
              </div>
              <span className="status-badge active">Control</span>
            </div>
          </div>

          <div className="record-card">
            <div className="record-card-head">
              <div>
                <h4>Backup</h4>
                <p>Auto backup is a workspace preference flag for future upgrades.</p>
              </div>
              <span className="status-badge active">Ready</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}