import DashboardPage from "../pages/DashboardPage";
import RecordsPage from "../pages/RecordsPage";
import MorePage from "../pages/MorePage";
import SettingsPage from "../pages/SettingsPage";

function Sidebar({ tabs, activeTab, onTabChange, currency, totalActivePortfolio }) {
  const items = [
    { key: tabs.HOME, label: "Home", icon: "⌂" },
    { key: tabs.RECORDS, label: "Records", icon: "▣" },
    { key: tabs.MORE, label: "More", icon: "≡" },
    { key: tabs.SETTINGS, label: "Settings", icon: "⚙" },
  ];

  return (
    <aside className="app-sidebar">
      <div className="brand-block">
        <div className="brand-logo">FD</div>
        <div>
          <div className="brand-title">FD Wealth Engine</div>
          <div className="brand-subtitle">Private Banking Console</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.key}
            className={`sidebar-link ${activeTab === item.key ? "active" : ""}`}
            onClick={() => onTabChange(item.key)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

     <div className="sidebar-footer-cards">
  <div className="sidebar-mini-card">
    <span>BASE CURRENCY</span>
    <strong>{currency}</strong>
  </div>

  <div className="sidebar-mini-card">
    <span>ACTIVE PORTFOLIO</span>
    <strong>
      {currency} {Number(totalActivePortfolio || 0).toLocaleString()}
    </strong>
  </div>

  <div className="sidebar-mini-card version-card">
    <span>SYSTEM VERSION</span>
    <strong>V32.4 FINAL RELEASE</strong>
  </div>
</div>

    </aside>
  );
}

function TopBar({ title, currency }) {
  return (
    <header className="topbar">
      <div>
        <div className="topbar-version">FD WEALTH ENGINE · V32.4 FINAL RELEASE</div>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-actions">
        <div className="topbar-pill">{new Date().toLocaleDateString("en-GB")}</div>
        <div className="topbar-pill primary">{currency} Workspace</div>
      </div>
    </header>
  );
}

export default function AppShell({
  tabs,
  activeTab,
  setActiveTab,
  settings,
  onUpdateSettings,
  records,
  activeRecords,
  currency,
  totalActivePortfolio,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,

  // 🔥 加这里
  onUndoExecution,

  onCloseRecord,
  onRolloverRecord,
}) {
  let pageTitle = "Portfolio Overview";
  let page = null;

  const sharedPageProps = {
  tabs,
  onTabChange: setActiveTab,
  currency,
  records,
  activeRecords,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
};

  switch (activeTab) {
    case tabs.RECORDS:
      pageTitle = "Records";
      page = (
        <RecordsPage
          {...sharedPageProps}
          onAddRecord={onAddRecord}
          onUpdateRecord={onUpdateRecord}
          onDeleteRecord={onDeleteRecord}
          onCloseRecord={onCloseRecord}
          onRolloverRecord={onRolloverRecord}
        />
      );
      break;

    case tabs.MORE:
      pageTitle = "Execution Center";
      page = (
        <MorePage
          {...sharedPageProps}
          onAddRecord={onAddRecord}
          onUpdateRecord={onUpdateRecord}
          onDeleteRecord={onDeleteRecord}
          onCloseRecord={onCloseRecord}
          onRolloverRecord={onRolloverRecord}
        />
      );
      break;

    case tabs.SETTINGS:
      pageTitle = "Settings";
      page = (
        <SettingsPage
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          currency={currency}
        />
      );
      break;

    case tabs.HOME:
    default:
      pageTitle = "Portfolio Overview";
      page = (
        <DashboardPage
          {...sharedPageProps}
          onUpdateRecord={onUpdateRecord}
          onDeleteRecord={onDeleteRecord}
        />
      );
      break;
  }
  return (
    <div className="app-shell">
      <Sidebar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currency={currency}
        totalActivePortfolio={totalActivePortfolio}
      />

      <div className="shell-main">
        <TopBar title={pageTitle} currency={currency} />

        <div className="shell-content">
          {page}

          <footer className="system-footer">
            <div>FD Wealth Engine · Private Banking Console</div>

            <div>
              V32.4 FINAL RELEASE · Built with React + Electron
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
  
