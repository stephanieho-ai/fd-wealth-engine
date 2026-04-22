export default function TopBar({ title, subtitle, rightText }) {
  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-sub">{subtitle}</div>
      </div>
      <div className="today-chip">{rightText}</div>
    </header>
  );
}