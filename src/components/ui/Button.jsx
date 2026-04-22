export default function Button({
  children,
  variant = "ghost",
  className = "",
  ...props
}) {
  const classes =
    variant === "primary"
      ? "primary-btn"
      : variant === "danger"
      ? "danger-action-btn"
      : "ghost-btn";

  return (
    <button className={`${classes} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}