export default function BottomNav({ items, activeKey, onChange }) {
  return (
    <nav className="bottom-nav four">
      {items.map((item) => (
        <button
          key={item.key}
          className={`bottom-nav-item ${activeKey === item.key ? "active" : ""}`}
          onClick={() => onChange(item.key)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}