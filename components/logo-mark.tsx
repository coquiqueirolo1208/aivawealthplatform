export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 252 60"
      className={className}
      style={{ height: 26, width: 109, display: "block", color: "var(--paper)" }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon points="30,4 0,56 60,56" fill="currentColor" />
      <rect x="78" y="4" width="18" height="52" fill="currentColor" />
      <polygon points="114,4 174,4 144,56" fill="currentColor" />
      <polygon points="208,4 178,56 238,56" fill="currentColor" />
    </svg>
  );
}
