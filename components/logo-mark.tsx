export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 216 60"
      className={className}
      style={{ height: 26, width: 94, display: "block", color: "var(--paper)" }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon points="27,4 2,56 52,56" fill="currentColor" />
      <rect x="67" y="4" width="16" height="52" fill="currentColor" />
      <polygon points="98,4 148,4 123,56" fill="currentColor" />
      <polygon points="188,4 163,56 213,56" fill="currentColor" />
    </svg>
  );
}
