export default function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 50,
        height: 28,
        borderRadius: 20,
        background: checked ? "#22c55e" : "#ccc",
        position: "relative",
        cursor: "pointer",
        transition: "0.3s",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 2,
          left: checked ? 24 : 2,
          transition: "0.3s",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}